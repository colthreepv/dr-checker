registry-notify
===============
Lambda function that checks specific Docker Image tags for updates

# How to Install
TO BE DONE when project reaches 1.0

# Getting Started
A minimal configuration would be:

file: **.config.json**
```json
[{
  "repository": "library/node",
  "tags": ["8", "10"],
  "notification": "http://requestbin.fullcontact.com/<url>"
}]
```

This example config _will_ emit a notification when the image for
`library/node:8` or `library/node:10` changes.
