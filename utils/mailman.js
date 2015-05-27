var postmark = require("postmark")
  , SERVER_KEY = process.env.POSTMARK_API_TOKEN
  , SENDER = "help@numenta.org"
  ;
  
if (! SERVER_KEY){
    throw Error('The Postmark server-key is missing! '
        + 'Please set it to send Emails using: ' +
        '\nexport POSTMARK_API_TOKEN="<server_key>"');
}

function sendMail(to, subject, body, callback) {
    /*
    A simple function using the Postmark Email-Client
    using the specified sender mail-adress and the enviornment-variable POSTMARK_API_TOKEN
    Set callback to check if your function call was successful.
    */
    var client = new postmark.Client(SERVER_KEY);
    client.sendEmail({
        "From": SENDER
      , "To": to
      , "Subject": subject
      , "TextBody": body
    }, callback);
}
module.exports = sendMail;
