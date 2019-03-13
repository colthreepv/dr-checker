registry-notify
===============
Lambda function that checks specific Docker Image tags for updates

# How to Install
TO BE DONE when project reaches 1.0

# Configuration
A minimal configuration would be:

```json
{
  "images": {
    "repository": "library/node",
    "tags": ["8", "10"],
    "notification": "http://requestbin.fullcontact.com/<url>"
  }
}
```
