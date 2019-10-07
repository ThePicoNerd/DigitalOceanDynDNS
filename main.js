require("dotenv").config();

const axios = require("axios");

var previous = "";

const API_TOKEN = process.env.API_TOKEN;

function getIp() {
  return new Promise((resolve, reject) => {
    axios.get("https://ipv4bot.whatismyipaddress.com").then(response => {
      resolve(response.data);
    });
  });
}

const records = require("./records");

async function check() {
  var ip = await getIp();

  if (ip !== previous) {
    records.forEach(async record => {
      console.log(
        `[LOG] Setting record "${record.domain}/${record.id}" ("${record.comment}") to "${ip}" ...`
      );
      await update(ip, record.domain, record.id);

      previous = ip;
      console.log(
        `[LOG] Successfully updated record "${record.domain}/${
          record.id
        }" ("${record.comment}") to "${ip}"!`
      );
    });
  }
}

function update(ip, domain, id) {
  return new Promise((resolve, reject) => {
    axios
      .put(
        `https://api.digitalocean.com/v2/domains/${domain}/records/${id}`,
        {
          data: ip
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`
          }
        }
      )
      .then(response => {
        if (response.data.domain_record.data == ip) {
          resolve(true);
        } else {
          reject();
        }
      });
  });
}

check();