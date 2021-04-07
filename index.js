const crypto = require("crypto")

addEventListener("fetch", event => {
  event.respondWith(githubWebhookHandler(event.request))
})

async function githubWebhookHandler(request) {
  if (request.method !== "POST") {
    return simpleResponse(
      200,
      "Please send a POST request :)"
    )
  }
  try {
    const formData = await request.json()
    const headers = await request.headers
    const action = headers.get("X-GitHub-Event")
    const repo_name = formData.repository.full_name
    const sender_name = formData.sender.login

    if (!checkSignature(formData, headers)) {
      return simpleResponse(403, "Wrong password, try again :P")
    }

    return await sendText(`${sender_name} has made a '${action}' onto your repo '${repo_name}'`)

  } catch (e) {
    return simpleResponse(
      200,
      `Error:  ${e}`
    )
  }
}

function simpleResponse(statusCode, message) {
  let resp = {
    message: message,
    status: statusCode
  }

  return new Response(JSON.stringify(resp), {
    headers: { "Content-Type": "application/json" },
    status: statusCode
  })
}

async function createHexSignature(requestBody) {
  let hmac = crypto.createHmac("sha1", SECRET_TOKEN)
  hmac.update(requestBody,"utf-8")

  return hmac.digest("hex")
}

async function checkSignature(formData, headers) {
  let expectedSignature = await createHexSignature(formData)
  let actualSignature = headers.get("X-Hub-Signature")

  return expectedSignature === actualSignature
}

async function sendText(message){
  const endpoint = "https://api.twilio.com/2010-04-01/Accounts/" + ACCOUNT_SID + "/Messages.json"

  let encoded = new URLSearchParams()
  encoded.append("To", RECIPIENT)
  encoded.append("From", "+12569524787")
  encoded.append("Body", message)

  let token = btoa(ACCOUNT_SID + ":" + AUTH_TOKEN)

  const request = {
    body: encoded,
    method: "POST",
    headers: {
      "Authorization": `Basic ${token}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }

  let result = await fetch(endpoint, request)
  result = await result.json()

  return new Response(JSON.stringify(result), request)
}