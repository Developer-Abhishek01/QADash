import { ApiClient, ApiResponse } from '../api-client';
import { Logger } from '../../utils/logger';

export interface SoapRequest {
  envelope: string;
}

export interface SoapResponse {
  body: string;
  fault?: SoapFault;
}

export interface SoapFault {
  faultCode: string;
  faultString: string;
  faultActor?: string;
}

export class SoapClient {
  private client: ApiClient;
  private logger: Logger;
  private endpoint: string;
  private namespace: string;

  constructor(client: ApiClient, endpoint: string, namespace: string, logger?: Logger) {
    this.client = client;
    this.endpoint = endpoint;
    this.namespace = namespace;
    this.logger = logger || new Logger('SoapClient');
  }

  async call<T = unknown>(action: string, params: Record<string, unknown>): Promise<ApiResponse<SoapResponse>> {
    const soapBody = this.buildSoapEnvelope(action, params);
    this.logger.info(`SOAP call: ${action}`);

    const response = await this.client.post(this.endpoint, soapBody, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${this.namespace}/${action}`,
      },
    });

    return this.parseSoapResponse<T>(response);
  }

  private buildSoapEnvelope(action: string, params: Record<string, unknown>): string {
    const paramsXml = Object.entries(params)
      .map(([key, value]) => `      <${key}>${this.escapeXml(String(value))}</${key}>`)
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                xmlns:ns="${this.namespace}">
  <soap:Header/>
  <soap:Body>
    <ns:${action}>
${paramsXml}
    </ns:${action}>
  </soap:Body>
</soap:Envelope>`;
  }

  private parseSoapResponse<_T>(response: ApiResponse): ApiResponse<SoapResponse> {
    const bodyStr = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    
    const faultMatch = bodyStr.match(/<fault>([\s\S]*?)<\/fault>/);
    if (faultMatch) {
      const faultCodeMatch = bodyStr.match(/<faultcode>(.*?)<\/faultcode>/);
      const faultStringMatch = bodyStr.match(/<faultstring>(.*?)<\/faultstring>/);
      
      return {
        ...response,
        body: {
          body: bodyStr,
          fault: {
            faultCode: faultCodeMatch?.[1] || 'Unknown',
            faultString: faultStringMatch?.[1] || 'Unknown error',
          },
        },
      };
    }

    const responseObj: SoapResponse = { body: bodyStr };
    return { ...response, body: responseObj };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async healthCheck(): Promise<ApiResponse<SoapResponse>> {
    return this.call('HealthCheck', {});
  }
}