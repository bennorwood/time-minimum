# Bikky Tech Review

## 1. Algorithm and Data Structure
This solution reads from stdin.
I'm rolling with these assumptions defined:
 - The number of time points in the given list is at least 2 and won't exceed 20000.
 - The input time is legal and ranges from 00:00 to 23:59.

### Execution
#### Dockerized Execution Notes
Prereqs:

You'll need to have docker running on your machine to execute command inside container. You can find installation instructions here:
https://docs.docker.com/docker-for-mac/install/

Example Steps to run as Docker container
If you have a test-input.dat file to pipe into command for testing

 ```
    docker build -t min-time .
    docker run -i min-time < test-input.dat
    cat test-input.dat | docker run -i min-time
 ```


#### Steps to run as Nodejs shell script
Prereqs:

You'll need to install Nodejs to run the command as is below. Use the latest version of Long Term Support. You can find it here https://nodejs.org/en/

Example execution
This file pulls input from a test file and pipes it into the command

```
    ./min-time-difference.js < test-input.dat
    cat test-input.dat | ./min-time-difference.js
```

## 2. Loyalty Program
There exists a loyalty program with Customer data which you have access to - First Name, Last Name, email, phone (sometimes), LTV, store location, etc. You need to create a system which segments this data based on various factors and has the capacity to send email drip campaigns to one or more of these customer segments at a time. This requires integration with an Email Service Provider (ESP - i.e., MailChimp) to send the emails.

Input for the system : Customer Data from a Loyalty program from 20 locations (Upto 100k for each location)
Output of the system : Contacts being pushed to an ESP and emails being sent

Note:
1. One customer can be part of multiple segments.
2. Each customer gets a series of emails based on their loyalty data

### My Thoughts

#### Assumptions
1. Customers can receive multiple emails: It seems like it's ok for a customer to receive multiple emails if they are in different loyalty programs as opposed to 1 aggregate message per customer for all the campaigns they might be a part of. If we have to send 1 message per customer, adding a reduction on the dynamodb table to aggregate loyalty information per customer before the email event would be the route to take. This would be less strain on the email service which generally is a good thing. Not going to talk about it too much as its not MVP/first class problem. You can run this system without it, but it seems like it could be a nice efficiency gain if desired.

#### Main concerns
 1. Throttling messages to Email sender
 2. Maximizing Concurrency of loyalty campaign member processing
 3. Stick with Managed AWS solutions for scale/reliability/speed of development

#### Design using AWS
 1. S3 [Loyalty Program + Campaign Storage]: I would use S3 to track loayalty program information. It's cheap (~0.02/GB/month), secure (if you set it up right) and language agnostic. Meaning a PHP or Python app can stream loyalty information securely to an S3 bucket, and the consumers that depend on this information can be written a different language entirely. Each loyalty program may have any number of campaigns with an email template and some way to describe the rules to determine if a customer is a target in a loyalty programs campaign. All of the campaign information can be reasonably represented with JSON. I suggest an event standard: https://github.com/cloudevents/spec/blob/master/json-format.md#32-examples

Example Loyalty Program
```
{
    "specversion": "1.0",
    "type" : "com.bikky.loyalty.program",
    "source" : "/php/application",
    "id" : "<unique id>",
    "time" : "<last updated date ISO 8601>",
    "datacontenttype" : "application/json",
    "data" : {
        "request_url" : "/loyalty-programs/<unique id>",
        "name": "Bubba Gump Shrimp Co.",
        "id": "<unique id>",
        "timezone": "America/Chicago",
        "associated_users": "<location in S3>"
        // etc
    }
}
```

Example Loyalty Campaign
```
{
    "specversion": "1.0",
    "type" : "com.bikky.loyalty.campaign",
    "source" : "/php/application",
    "id" : "<unique id>",
    "time" : "<last updated date ISO 8601>",
    "datacontenttype" : "application/json",
    "data" : {
        "request_url" : "/loyalty-programs/1234/campaigns/<unique id>",
        "name": "Lenten Special!",
        "target": {
            "drip": [
                {
                    "email_template_name": "bubba_gump_lenten_special",
                    "schedule": "30 6 L * ? *",
                    "end_date": "2020-03-12T00:00:00Z",
                    "start_date": "2020-01-12T00:00:00Z",
                    // Customers that have spent over $50
                    "gross_spent": "50"
                },
                {
                    "email_template_name": "bubba_gump_lenten_special_blitz",
                    "schedule": "* * 1/10 * ? *", // every 10 days
                    "start_date": "2020-03-12T00:00:00Z",
                    "end_date": "2020-04-12T00:00:00Z",
                    // Customers that have ordered after midnight January 1, 2020 UTC
                    "last_order_date": "2020-01-01T00:00:00Z",
                }
            ]
        }
    }
}
```

 2. AWS Lambda or AWS Batch [Loyalty Program/Campaign Task Producer]: The purpose of this is to simply queue up (loyalty program, loyalty campaign, customer) processing. Ideally this lambda should be able to prepare the needed stateful information to run the rules on a single customer for a given loyalty program. The limitation with Lambda is that it has a maximum execution time of 15 minutes, if we are processing over 15 minutes AWS Batch is the better solution. SQS send message batch also has a hard limit of 256KB per request so step 2 here is really responsible for safely sending max size [(program, campaign, customer), (//etc)] messages to SQS. This lambda runs concurrently for every type of loyalty campaign. SNS scales extremely well under heavy load. The first million publishes are free per month and 0.50 cents per million per month publishes after. Message deliveries to SQS & AWS lambdas are completely free of charge.

  _Note: Pushing a notification to SNS might be a more stable long term solution as well since we may have different types of loyalty programs that should filter into different types of processing. So an SNS notification would be published and we'd have N number of SQS queues that would be listening to specific types of loyatly program events._
 
 Depending on how often loyalty program segments need to be processed there are different triggers we can setup here:
 - Everytime S3 bucket is updated, run loyalty program processing
 - cron scheduling (Ex: On the 1st of every month run loyalty campaign Y)
 - SQS consumer with upstream application to trigger a loyalty program campaign event with parameters (example: legacy application to trigger loyalty campaign Y event with specific campaign data)

 3. SNS + SQS AWS Lambda [(loyalty program X, Loyalty Campaign Y, Customer)] Message Processor: This represents a class of lambdas. We may have 1-X different loyalty programs with Y active campaigns per program. So each (loyalty program, loyalty campaign) tuple _could_ have an SQS queue paired with a lambda that will process a batch of customers (at most 10 at a time) for each campaigns ruleset if needed. But, if we are able to come up with a generic enough rules processing DSL then we'd have exactly 1 lambda processing generic rulesets from all campaigns. 

_Note: SNS allows you to filter messages so this implementation is flexible if there are complex campaigns where we'd need non-trivial processing. https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html_
  
The deliverable for this class of lambda is a dynamodb dump of enriched data to know if a customer successfully qualifies as a target for the (loyalty program X, loyalty campaign Y). So the information in dynamo should be something like (loyalty, campaign, drip, customer, last_email_notification). We can set TTL for this data to be the end of the campaign.

 4. Dynamo + Lambda [Drip Campaign Poller]: Thought about this one after the initial email. We'd need to store enough information to know how often we should send emails to customers. This lambda simply queries dyanmo for active (loyalty, campaign, drip, customer, last_email_notification) data and then queues it all for the ESP handler to poll over time. The trigger for this lambda would be on a cron schedule.

 5. SQS + AWS Lambda ESP Handler (Possibly SES): This lambda is responsible for throttling ALL requests to the ESP. Since its a polling based process, the lambda has control over how many messages it processes per minute. This is important since a lot of integrations have rate limiting concerns. The max retention period for SQS is 14 days, meaning that the system would have to have so much queue backup to where a message sits in a queue for 14 days before being "lost". If this was a concern utilizing the dynamo table or S3 to store this information would be ideal. This lambda should work with a generic message schema to be utilized for any ESQ related work. This lambda should update dynamo to indicate last time customer has been engages with email.

Example event body that will send SES templated email
```
{
  Destination: { /* required */
    BccAddresses: [
      'STRING_VALUE',
      /* more items */
    ],
    CcAddresses: [
      'STRING_VALUE',
      /* more items */
    ],
    ToAddresses: [
      'STRING_VALUE',
      /* more items */
    ]
  },
  Source: 'STRING_VALUE', /* required */
  Template: 'STRING_VALUE', /* required */
  TemplateData: 'STRING_VALUE', /* required */
  ReplyToAddresses: [
    'STRING_VALUE',
    /* more items */
  ],
  Tags: [
    {
      Name: 'STRING_VALUE', /* required */
      Value: 'STRING_VALUE' /* required */
    },
    /* more items */
  ],
  TemplateArn: 'STRING_VALUE'
}
```
## 3. Process Large CSV files
How would you design a system to process large .csv files (upto 100k rows) which needs to be uploaded and parsed row by row. Each row has customer demographic data independent from each other.

### Assumptions
 - We know when the file is updated and the processing can happen safely after without worrying about the file updating mid-process.
 - Its accessible in AWS via S3

### Solution
Use nodejs stream processing. You don't load the entire file into memory, you only process a chunk at a time until you are finished. Node stream processing is also event based and not synchronous.

#### The challenge here is really how long does it take to do the processing.
You have a 2 things you can tweak here. A naive solution would be to do the processing at the same time you are reading the file...if you do this you're adding time complexity to complete the processing. Ideally, you'd want to think about a mapping solution to where program A's single responsibility is to stream the contents of the large file into a queue for processing in program B (as fast as possible). The memory consuption for Program A remains constant since you'll never attempt to read the entire file in memory. Program B should _ideally_ be able to run concurrently and is entirely independent from the processing in A. If there are requirements to provide some aggregate data, then Program B should be able to dump this information in something like a DynamoDB table that can be used for downstream data aggregation/enrichment.

So, if you've minimized the amount of time it takes program A to process the file and it takes less than 15 minutes you can use AWS lambda to do the processing. If program A takes longer than 15 minutes, you'll have to containerize Program A and run it via AWS batch.

## 4. Business Strategy
What are your 2-3 priorities for the year, and how do you plan to tactically execute on them? 

1. You need the right level of attribution for your users and infrastructure in addition to capturing and logging key events (How are we capturing metrics).
   You can't really make a data decision without any data. So at the infrastructure level what does it mean for the application to be "up" vs. "down" and how can we measure and have the right alarms in place to ensure uptime? How much revenue is lost per hour of "down" time? What do peak periods look like where uptime is critical? How secure is the infrastructure? Are there SLAs for our user experience? Are there different SLAs for different user types? At the application level how engaged are the users for feature X,Y,Z? Can we identify typical user behavior? Can we identify behavior when the user experience is less than great?

2. To minimize the cost of technology and infrastructure while maintaining scale.
   - What's the most expensive technology cost? Is there a more cost effective tool for the job that doesn't compromise stability? Replace _safely_. Repeat.
   - Is there "low hanging fruit" in a sense where we can see immediate savings from the push of a button or very minimal effort? (AWS Savings Plans for example)

3. To build a safe, livable engineering platform that enables speed of feature work and deployments.
    1. Lower the time to fist commit (Look to improve the following):
      - How well-organized is the code base?
      - How much confidence do we have in our test suite?
      - How is the developer environment?
    2. Continuous Deployments
      - How mature is the CI process?
      - How mature is the CD process?
    3. Identify knowledge gaps for reasonable training opportunities

## General AWS Notes
1. SLA on SNS/SQS (99.9% uptime guaranteed): https://aws.amazon.com/messaging/sla/
2. SLA on S3 (99.9% uptime guaranteed): https://aws.amazon.com/s3/sla/
3. AWS FAQ on SQS/SNS Scalability (https://aws.amazon.com/sqs/faqs/ https://aws.amazon.com/sns/faqs/): Amazon SQS requires no administrative overhead and little configuration. Amazon SQS works on a massive scale, processing billions of messages per day. You can scale the amount of traffic you send to Amazon SQS up or down without any configuration. Amazon SQS also provides extremely high message durability, giving you and your stakeholders added confidence. Amazon SQS and SNS are lightweight, fully managed message queue and topic services that scale almost infinitely and provide simple, easy-to-use APIs. You can use Amazon SQS and SNS to decouple and scale microservices, distributed systems, and serverless applications, and improve reliability.
4. FAQ on Lambda (https://aws.amazon.com/lambda/faqs/): You pay only for the compute time you consume - there is no charge when your code is not running. With Lambda, you can run code for virtually any type of application or backend service - all with zero administration.

