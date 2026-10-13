import type { ConnectionOptions } from 'tls';
import type { IClientOptions } from 'mqtt';

type SocketFamilyOptions = {
  family?: 4 | 6;
};

/**
 * mqtt.js forwards these socket options to net/tls.connect at runtime,
 * but they are not declared in IClientOptions. Printers on the LAN are
 * reached over IPv4 only and use self-signed certificates, so `family`
 * and `checkServerIdentity` must survive typing.
 */
export type PrinterMqttClientOptions = IClientOptions &
  SocketFamilyOptions &
  Pick<ConnectionOptions, 'checkServerIdentity'> & {
    tls?: ConnectionOptions & SocketFamilyOptions;
  };
