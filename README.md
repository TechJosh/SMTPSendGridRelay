# SMTP to SendGrid Relay
Allows incoming email on a port (25) to be relayed to SendGrid for distribution.

## Configuration

Rename the .env.sample file to .env and ensure that the following environment variables are set in the .env file:
```
SSGR_PORT=25
SENDGRID_API_KEY=SG.123abc-helloworld
```

## Running standalone
Execute the following from the app folder to install dependencies and start the server:
```
npm install
npm start
```

## Docker build command
From the root folder execute:
```
docker build -t your-repo-tag -f docker/Dockerfile .
```

## Docker compose setup
From the docker folder execute:
```
docker-compose up -d
```

## NPM Packages and Resources Used
- `dotenv` for loading environment variables from a .env file. [GitHub Repo](https://github.com/motdotla/dotenv)
- `@sendgrid/mail` for sending emails over the SendGrid API. [Documentation](https://docs.sendgrid.com/api-reference/mail-send/mail-send) [GitHub Repo](https://github.com/sendgrid/sendgrid-nodejs)
- `mailparser` for parsing emails sent into the server. [GitHub Repo](https://github.com/nodemailer/mailparser)
- `smtp-server` for listening for incoming emails. [Documentation](https://nodemailer.com/extras/smtp-server/)
- `winston` for logging. [Github Repo](https://github.com/winstonjs/winston)