require("dotenv").config();
const { argv } = require("yargs");

const yaml = require("js-yaml");
const fs = require("fs");
const configFilePath = argv["config"] || process.env.CONFIGFILE || "./config.yaml";
const configFile = fs.readFileSync(configFilePath);
const config = yaml.load(configFile);
const axios = require("axios");
const apiKey = argv["api-key"] || process.env.API_KEY;

async function getRecords(domain) {
  let {
    data: { domain_records: records }
  } = await axios({
    url: `https://api.digitalocean.com/v2/domains/${domain}/records`,
    method: "GET",

    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  return records;
}

console.log(apiKey);

class Domain {
  constructor(name, records) {
    this.name = name;
    this.records = records;
  }

  /**
   * Add a local record to the remote nameserver.
   *
   * @param {Record} record
   */
  addRecord(record) {
    return axios({
      url: `https://api.digitalocean.com/v2/domains/${this.name}/records`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      data: record.json
    });
  }

  updateRecord(id, record) {
    return axios({
      url: `https://api.digitalocean.com/v2/domains/${this.name}/records/${id}`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      data: record.json
    });
  }

  async update() {
    let remoteRecords = await getRecords(this.name);

    for (let record of this.records) {
      let remote = remoteRecords.filter(remote => {
        return record.name === remote.name && record.type === remote.type; // Name and type must match.
      })[0]; // There can't be more than one record with the same name and type.

      if (remote) {
        // Make sure we are not updating if we don't need to.
        for (let key in record) {
          if (remote[key] !== record[key]) {
            console.log(
              `Updating ${record.type} record "${record.name}.${this.name}"`
            );
            await this.updateRecord(remote.id, record);
            break;
          }
        }

        // Already up to date.
        console.log(
          `Skipping ${record.type} record "${record.name}.${
            this.name
          }" because it's already updated`
        );
      } else {
        console.log(
          `Creating new ${record.type} record "${record.name}.${this.name}"`
        );
        await this.addRecord(record); // Add the record to DigitalOcean's servers since it's not there yet.
      }
    }
  }
}

class Record {
  constructor({ name, data, type, ttl }) {
    this.name = name;
    this.data = data;
    this.type = type || "A";
    this.ttl = ttl || 300;
  }

  get json() {
    return {
      name: this.name,
      data: this.data,
      type: this.type,
      ttl: this.ttl
    };
  }
}

/**
 * Get this machine's public IPv4.
 *
 * @returns The IP
 */
async function myIPv4() {
  let { data: ip } = await axios.get("https://ipv4bot.whatismyipaddress.com");
  return ip;
}

async function main() {
  let ip = await myIPv4();

  for (let entry of config.domains) {
    let records = [];

    for (let record of entry.records) {
      records.push(
        new Record({
          name: record.name,
          data: record.data || ip, // If no IP is specified, default to this machine's public ip.
          type: record.type,
          ttl: record.ttl
        })
      );
    }

    let domain = new Domain(entry.name, records);

    await domain.update();
  }
}

main();
