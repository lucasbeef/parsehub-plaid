const axios = require('../node_modules/axios')
const querystring = require('../node_modules/querystring')

const PING_EVERY = 3

var exports = module.exports = {};

// scrap is the only method you need
// be sure to pass in your apiKey and projectToken (look for it in your parsehub account)
//startUrl, startTemplate, startValue and sendEmail are optional
exports.scrap = function(config) {
  return new Promise((resolve, reject) => {
    launchRun(config)
    .then((res) => {
      return waitForRunCompletion(res.data.run_token, config)
    })
    .then((runToken) => {
      resolve(fetchRunResults(runToken, config))
    })
    .catch((err) =>  {
      console.log(err)
      reject (err)
    });
  });
}

// beyond this point are the private methods -> .

// returns the params form-urlencoded from the options passed to config
// this is where we provide the apiKey to Parsehub
function prepParams(config) {
  let params = { api_key: config.apiKey }

  if (config.startUrl) {
    params.start_url = config.startUrl
  }
  if (config.startTemplate) {
    params.start_template = config.startTemplate
  }
  if (config.start_value_override) {
    params.start_value_override = config.startValue
  }
  if (config.sendEmail) {
    params.send_email = config.sendEmail
  }

  return querystring.stringify(params);
}

// runs the parsehub scrapper
function launchRun(config) {
  const parsehubUrl = "https://www.parsehub.com/api/v2/projects/" + config.projectToken + '/run'

  const requestConfig = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  }

  console.log('Launch Parsehub Run at : ' + config.startUrl)
  return axios.post(parsehubUrl, prepParams(config), requestConfig)
}

// ping Parsehub for the results
function waitForRunCompletion(runToken, config) {
  let i = 0
  console.log('Parsehub is performing some magic, be patient...')

  return new Promise((resolve, reject) => {
    let interval = setInterval(() => {
      axios.get("https://www.parsehub.com/api/v2/runs/" + runToken + "?api_key=" + config.apiKey)
      .then((res) => {
        if (res.data.status === "complete") {
          clearInterval(interval)
          console.log("Scrapping complete (" + i + " sec)")

          resolve(runToken)
        }
      })
      .catch((err) => {
        clearInterval(interval)
        console.log('Error while pinging Parsehub')
        reject(err)
      })
      i += PING_EVERY
    } , PING_EVERY * 1000)
  })
}

// Fetching the scrapped data
function fetchRunResults(runToken, config) {
  console.log("Fetching the results...")
  return axios.get("https://www.parsehub.com/api/v2/runs/" + runToken + "/data?api_key=" + config.apiKey)
}
