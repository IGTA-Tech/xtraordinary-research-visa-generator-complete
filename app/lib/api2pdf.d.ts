declare module 'api2pdf' {
  export default class Api2Pdf {
    constructor(apiKey: string);
    headlessChrome: {
      htmlToPdf(html: string, options?: any): Promise<{ pdf: string; success: boolean }>;
    };
    chromeUrlToPdf(
      url: string,
      options?: {
        landscape?: boolean;
        marginTop?: string;
        marginBottom?: string;
        marginLeft?: string;
        marginRight?: string;
        [key: string]: any;
      }
    ): Promise<{ pdf: string; success: boolean; FileUrl?: string }>;
    chromeHtmlToPdf(
      html: string,
      options?: {
        landscape?: boolean;
        printBackground?: boolean;
        [key: string]: any;
      }
    ): Promise<{ pdf: string; success: boolean; FileUrl?: string }>;
    pdfsharpMerge(
      urls: string[],
      options?: {
        inline?: boolean;
        fileName?: string;
        [key: string]: any;
      }
    ): Promise<{ pdf: string; success: boolean; FileUrl?: string }>;
  }
}
