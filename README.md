# DigitalOceanDynDNS

Automatically update DigitalOcean Domains Records.

## `config.yaml`

The main config file is `config.yaml`. Each domain is specified inside the `domains` array. In each element of the `domains`, you must specify the name of the domain in `name`, and the domain's records in the `records` array.

| Property | Description                                        | Required | Default value                  |
| -------- | -------------------------------------------------- | -------- | ------------------------------ |
| `name`   | The name of the record                             | Yes      |                                |
| `type`   | The DNS record's type, like `A`, `SRV` and `CNAME` | No       | `"A"`                          |
| `data`   | The record's content. Also known as _value_.       | No       | The public IPv4 of the machine |
| `ttl`    | Time to live.                                      | No       | `300`                          |

```yaml
domains:
  - name: lynx.agency
    records:
      - name: "@"
        type: "A"
        data: 1.1.1.1
        ttl: 300
      - name: "*"
        type: "A"
        data: 2.2.2.2
        ttl: 500
  - name: xn--sdermalmsskolan-8sb.com
    records:
      - name: "@"
```

## Authenticating

You must also provide your DigitalOcean API Key in order for this program to work. Simply add the environment variable `API_KEY` and set its value to your key (`export API_KEY="<REPLACE WITH YOUR DIGITALOCEAN API KEY>"`) or pass the argument `api-key` to the process (`node . --api-key=<REPLACE WITH YOUR DIGITALOCEAN API KEY>`).

## Examples

### Kubernetes CronJob

This CronJob runs DODDNS every 5 minutes. It gets the API key from a Secret and is configured via a ConfigMap. Start by creating the Secret:

`kubectl create secret generic digitalocean --from-literal=apiKey=<REPLACE WITH YOUR API KEY>`

This creates a Kubernetes Secret with one key, `apiKey`, with the API key as its value. Now create the ConfigMap.

First, you will need to edit `config.yaml` to make it fit your needs. Then, you must create a ConfigMap from it:

`kubectl create configmap doddns-config --from-file=config.yaml
`

```yaml
---
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: dyndns
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: doddns
              image: thepiconerd/digitaloceandyndns
              env:
                - name: API_KEY
                  valueFrom:
                    secretKeyRef:
                      - name: digitalocean
                        key: apiKey
              args:
                - "--config /etc/config/config.yaml"
              volumeMounts:
                - name: config
                  mountPath: /etc/config
              restartPolicy: OnFailure
          volumes:
            - name: config
              configMap:
                name: doddns-config
```