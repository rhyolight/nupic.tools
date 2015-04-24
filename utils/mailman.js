var postmark = require("postmark");
var SERVER_KEY = process.env.POSTMARK_API_TOKEN;
var SENDER = "help@numenta.org";

function sendMail(To, Subject, Body){
/*
A simplified function using the Postmark Email-Client
sing the specified sender mail-adress and the enviornment-variable POSTMARK_API_TOKEN
*/
var client = new postmark.Client(SERVER_KEY);
client.sendEmail({
    "From": SENDER, 
    "To": To, 
    "Subject": Subject, 
    "TextBody": Body
});
return 0
};
module.exports = sendMail;
