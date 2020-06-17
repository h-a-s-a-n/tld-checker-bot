addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

let data = {
  icann: [],
  registrar: {}
}
/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  let url = new URL(request.url)
  let defaultResponse = { body: 'Bad request', status: 400, headers: { 'content-type': 'application/json' } }
  let check = (url.pathname === `/bot/${SLUG}/${TOKEN}` && request.method === 'POST')
  let botResponse = (check === true) ? await bot(request) : false
  console.log(botResponse)
  let response = botResponse ? botResponse : defaultResponse
  return new Response(JSON.stringify(response.body, null, 2), response)
}

async function bot(request) {
  let output = { status: 200, headers: { 'content-type': 'application/json' } }
  let message
  let data = { icann: [], cloudflare: {} }
  try {
    let responseHeaders = { 'content-type': 'application/json' }
    let body = await request.json()
    let input = body.message.argumentText.trim().toLowerCase()
    if (input.startsWith('.')) input = input.replace('.', '')
    if (!input) throw new Error('no-input')
    let icann = await icannTlds()
    let cfRegistrar = await cloudflareTlds()
    //console.log(icann.result.tlds)
    let tldExists = icann.result.tlds.includes(input)
    let supportedByCf = cfRegistrar.result.tlds.includes(input)
    if (!tldExists) throw new Error('does-not-exist')
    if (supportedByCf) {
        message = `✅ \`${input}\` is supported!`
    } else {
        message = `❌ \`${input}\` is not supported (yet).`
    }
    let registrarInfo = await cloudflareTlds()
  } catch (err) {
    if (err.message === 'no-input') {
      message = "Yeah... I'm going to need some input. 🤓"
    } else if (err.message === 'does-not-exist') {
      message = "That TLD does not exist. 🤓"
    } else if (err.message === 'is-not-supported') {
      message = `Cloudflare Registrar doest not support \`${input}\` domains (yet).`
    } else {
      message = "I couldn't process your request: " + err.message
    }
  }
  output.body = {"text": message}
  return output
}

async function icannTlds() {
  let output = {
    success: false,
    result: {
      tlds: null
    },
    messages: []
  }
  try {
    let res = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt')
    if (res.ok) output.success = true
    let text = await res.text()
    let tlds = text.toLowerCase().split('\n').filter(x=>!x.startsWith('#'))
    if (tlds.length) {
      output.success = true
      output.result.tlds = tlds
    }
  } catch (err) {
    output.success = false
    output.messages.push(err.message)
  }
  return output
}

async function cloudflareTlds() {
  let output = {
    success: false,
    result: {
      tlds: null
    },
    messages: []
  }
  try {
    let res = await fetch('https://www.cloudflare.com/tld-policies/')
    let text = await res.text()
    let table = text.split('tbody>')[1]
    let rows = table.split('<tr>')
    let tlds = []
    for (let row of rows) {
      if (row.trim().length) {
        let tld = row.trim().split('</td>')[0].replace('<td>', '')
        tlds.push(tld)
      }
    }
    if (tlds.length) {
      output.result.tlds = tlds
      output.success = true
    }
  } catch(err) {
    console.log(err)
    output.success = false
    output.messages.push(err.message)
    
  }
  return output
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
