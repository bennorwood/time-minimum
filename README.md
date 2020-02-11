# Bikky Tech Review

## 1. Algorithm and Data Structure
This solution reads from stdin.
I'm rolling with these assumptions defined:
 - The number of time points in the given list is at least 2 and won't exceed 20000.
 - The input time is legal and ranges from 00:00 to 23:59.

# Execution
## Dockerized Execution Notes
I chose this route since its easier to not have to worry about system requirements to execute commands.

### Prereqs
You'll need to have docker running on your machine to execute command inside container. You can find installation instructions here:
https://docs.docker.com/docker-for-mac/install/

### Example Steps to run as Docker container
If you have a test-input.dat file to pipe into command for testing

 ```
    docker build -t min-time .
    docker run -i min-time < test-input.dat
    cat test-input.dat | docker run -i min-time
 ```


### Steps to run as Nodejs shell script

#### Prereqs
 You'll need to install Nodejs to run the command as is below. Use the latest version of Long Term Support. You can find it here https://nodejs.org/en/

### Example execution
This file pulls input from a test file and pipes it into the command

```
    ./min-time-difference.js < test-input.dat
    cat test-input.dat | ./min-time-difference.js
```