import * as winston from "winston";
import "dotenv/config";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import sgMail from "@sendgrid/mail";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { service: "user-service" },
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
    ],
});

if (process.env.NODE_ENV === "development") {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

const parseEmail = (email) => {
    return simpleParser(email);
};

const convertEmailToSendGridFormat = (email, session) => {
    return parseEmail(email).then((parsedEmail) => {
        const message = {
            subject: parsedEmail.subject,
            content: [],
            from: {},
            to: [],
            attachments: [],
        };

        if (parsedEmail.text) {
            message.content.push({
                type: "text/plain",
                value: parsedEmail.text,
            });
        }

        if (parsedEmail.html) {
            message.content.push({
                type: "text/html",
                value: parsedEmail.html,
            });
        }

        ['to', 'cc', 'bcc', 'from'].forEach((field) => {
            if (parsedEmail[field]) {
                message[field] = parsedEmail[field].value.map((email) => {
                    return {
                        email: email.address,
                        name: email.name || email.address
                    };
                });
            }
        });

        if (message.from) {
            message.from = message.from[0];
        }

        if (parsedEmail['reply-to']) {
            message.replyTo = parsedEmail['reply-to'].value.map((email) => {
                return {
                    email: email.address,
                    name: email.name || email.address
                };
            })[0];
        }

        if (session.envelope.mailFrom && session.envelope.mailFrom.address) {
            message.from = {
                email: session.envelope.mailFrom.address,
                name: session.envelope.mailFrom.address
            };
        }

        if (session.envelope.rcptTo && session.envelope.rcptTo.length > 0) {
            message.to = session.envelope.rcptTo.map((rcpt) => {
                return {
                    email: rcpt.address,
                    name: rcpt.address
                };
            });
        }

        if (parsedEmail.attachments) {
            parsedEmail.attachments.forEach((attachment) => {
                message.attachments.push({
                    type: attachment.contentType,
                    content: attachment.content,
                    filename: attachment.filename,
                    disposition: 'attachment',
                });
            });
        }

        return message;
    });
};

const handleEmail = (email, session) => {
    let tmp;
    convertEmailToSendGridFormat(email, session).then((sendGridEmail) => {
        tmp = sendGridEmail;
        logger.info(`SendGrid email: ${JSON.stringify(sendGridEmail)}`);
        return sgMail.send(sendGridEmail, false);
    }).then(() => {
        logger.info(`Email sent to ${JSON.stringify(tmp.to)} from ${JSON.stringify(tmp.from)}`);
    }).catch((err) => {
        const { message, code, response } = err;
        const dump = { message, code, response, tmp };
        logger.error(`Error relaying email: ${JSON.stringify(dump)}`);
    });
};

const server = new SMTPServer({
    secure: false,
    disabledCommands: ["AUTH"],
    onData: (stream, session, callback) => {
        logger.log("info", "Email stream started...");
        let buffer = "";

        stream.setEncoding("utf8");

        stream.on("data", (chunk) => {
            logger.info("Email stream incoming...");
            buffer += chunk;
        });

        stream.on("end", () => {
            logger.info("Email stream ended...");
            handleEmail(buffer, session);
            callback();
        });
    }
});

if (process.env.SSGR_PORT === undefined) {
    logger.error("SMTP service requires a port to listen on. Please set the port in the .env file.");
} else if (process.env.SENDGRID_API_KEY === undefined) {
    logger.error("SMTP service requires a SendGrid API key to be set. Please set the key in the .env file.");
} else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    server.listen(process.env.SSGR_PORT);
    logger.info(`SMTP service listening on port ${process.env.SSGR_PORT}`);
}