/**
 * ISO 20022 Parser
 * Parses and generates ISO 20022 XML messages (pacs, pain, camt, acmt)
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type {
  ISO20022Message,
  ISO20022MessageType,
  ISO20022Party,
  ISO20022Account,
  ISO20022Payment,
  ISO20022FinancialInstitution,
} from './types/finance';

export class ISO20022Parser {
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
    });
  }

  /**
   * Parse ISO 20022 XML message
   */
  parse(xml: string): ISO20022Message {
    const parsed = this.parser.parse(xml);

    // Detect message type from root element
    const messageType = this.detectMessageType(parsed);

    switch (messageType) {
      case 'pacs.008':
        return this.parsePacs008(xml, parsed);
      case 'pain.001':
        return this.parsePain001(xml, parsed);
      case 'camt.053':
        return this.parseCamt053(xml, parsed);
      case 'pacs.002':
        return this.parsePacs002(xml, parsed);
      case 'pain.002':
        return this.parsePain002(xml, parsed);
      default:
        return this.parseGeneric(xml, parsed, messageType);
    }
  }

  /**
   * Detect message type from XML structure
   */
  private detectMessageType(parsed: any): ISO20022MessageType {
    const root = Object.keys(parsed)[0];

    const typeMap: Record<string, ISO20022MessageType> = {
      Document: 'pacs.008', // Default if namespace indicates it
      FIToFICstmrCdtTrf: 'pacs.008',
      CstmrCdtTrfInitn: 'pain.001',
      BkToCstmrStmt: 'camt.053',
      BkToCstmrDbtCdtNtfctn: 'camt.054',
      FIToFIPmtStsRpt: 'pacs.002',
      CstmrPmtStsRpt: 'pain.002',
      IdModAdvc: 'acmt.023',
      IdVrfctnReq: 'acmt.024',
      RmtAdvc: 'remt.001',
    };

    // Check namespace for message type
    const xmlns = parsed[root]?.['@_xmlns'] || '';
    if (xmlns.includes('pacs.008')) return 'pacs.008';
    if (xmlns.includes('pain.001')) return 'pain.001';
    if (xmlns.includes('camt.053')) return 'camt.053';
    if (xmlns.includes('camt.054')) return 'camt.054';
    if (xmlns.includes('pacs.002')) return 'pacs.002';
    if (xmlns.includes('pain.002')) return 'pain.002';

    // Check document structure
    const doc = parsed.Document || parsed;
    for (const [key, msgType] of Object.entries(typeMap)) {
      if (doc[key]) return msgType;
    }

    return 'pacs.008'; // Default
  }

  /**
   * Parse pacs.008 - FI to FI Customer Credit Transfer
   */
  private parsePacs008(xml: string, parsed: any): ISO20022Message {
    const doc = parsed.Document?.FIToFICstmrCdtTrf || parsed.FIToFICstmrCdtTrf;
    const grpHdr = doc.GrpHdr;
    const cdtTrfTxInf = Array.isArray(doc.CdtTrfTxInf) ? doc.CdtTrfTxInf : [doc.CdtTrfTxInf];

    const payments: ISO20022Payment[] = cdtTrfTxInf.map((tx: any) => ({
      paymentId: tx.PmtId?.InstrId || '',
      instructionId: tx.PmtId?.InstrId,
      endToEndId: tx.PmtId?.EndToEndId || '',
      amount: {
        currency: tx.IntrBkSttlmAmt?.['@_Ccy'] || 'USD',
        value: parseFloat(tx.IntrBkSttlmAmt?.['#text'] || tx.IntrBkSttlmAmt || 0),
      },
      debtor: this.parseParty(tx.Dbtr),
      debtorAccount: this.parseAccount(tx.DbtrAcct),
      debtorAgent: this.parseAgent(tx.DbtrAgt),
      creditor: this.parseParty(tx.Cdtr),
      creditorAccount: this.parseAccount(tx.CdtrAcct),
      creditorAgent: this.parseAgent(tx.CdtrAgt),
      remittanceInformation: {
        unstructured: tx.RmtInf?.Ustrd ? (Array.isArray(tx.RmtInf.Ustrd) ? tx.RmtInf.Ustrd : [tx.RmtInf.Ustrd]) : undefined,
      },
      chargeBearer: tx.ChrgBr || 'SHAR',
      requestedExecutionDate: tx.ReqdExctnDt ? new Date(tx.ReqdExctnDt) : undefined,
    }));

    return {
      messageType: 'pacs.008',
      messageId: grpHdr.MsgId,
      creationDateTime: new Date(grpHdr.CreDtTm),
      numberOfTransactions: parseInt(grpHdr.NbOfTxs) || payments.length,
      controlSum: parseFloat(grpHdr.CtrlSum) || undefined,
      initiatingParty: this.parseParty(grpHdr.InitgPty),
      xml,
      parsed: { payments },
    };
  }

  /**
   * Parse pain.001 - Customer Credit Transfer Initiation
   */
  private parsePain001(xml: string, parsed: any): ISO20022Message {
    const doc = parsed.Document?.CstmrCdtTrfInitn || parsed.CstmrCdtTrfInitn;
    const grpHdr = doc.GrpHdr;
    const pmtInf = Array.isArray(doc.PmtInf) ? doc.PmtInf : [doc.PmtInf];

    const payments: ISO20022Payment[] = [];

    for (const pmt of pmtInf) {
      const cdtTrfTxInf = Array.isArray(pmt.CdtTrfTxInf) ? pmt.CdtTrfTxInf : [pmt.CdtTrfTxInf];

      for (const tx of cdtTrfTxInf) {
        payments.push({
          paymentId: tx.PmtId?.InstrId || '',
          instructionId: tx.PmtId?.InstrId,
          endToEndId: tx.PmtId?.EndToEndId || '',
          amount: {
            currency: tx.Amt?.InstdAmt?.['@_Ccy'] || 'USD',
            value: parseFloat(tx.Amt?.InstdAmt?.['#text'] || tx.Amt?.InstdAmt || 0),
          },
          debtor: this.parseParty(pmt.Dbtr),
          debtorAccount: this.parseAccount(pmt.DbtrAcct),
          debtorAgent: this.parseAgent(pmt.DbtrAgt),
          creditor: this.parseParty(tx.Cdtr),
          creditorAccount: this.parseAccount(tx.CdtrAcct),
          creditorAgent: this.parseAgent(tx.CdtrAgt),
          remittanceInformation: {
            unstructured: tx.RmtInf?.Ustrd ? (Array.isArray(tx.RmtInf.Ustrd) ? tx.RmtInf.Ustrd : [tx.RmtInf.Ustrd]) : undefined,
          },
          purpose: tx.Purp?.Cd,
          requestedExecutionDate: pmt.ReqdExctnDt ? new Date(pmt.ReqdExctnDt) : undefined,
        });
      }
    }

    return {
      messageType: 'pain.001',
      messageId: grpHdr.MsgId,
      creationDateTime: new Date(grpHdr.CreDtTm),
      numberOfTransactions: parseInt(grpHdr.NbOfTxs) || payments.length,
      controlSum: parseFloat(grpHdr.CtrlSum) || undefined,
      initiatingParty: this.parseParty(grpHdr.InitgPty),
      xml,
      parsed: { payments },
    };
  }

  /**
   * Parse camt.053 - Bank to Customer Statement
   */
  private parseCamt053(xml: string, parsed: any): ISO20022Message {
    const doc = parsed.Document?.BkToCstmrStmt || parsed.BkToCstmrStmt;
    const grpHdr = doc.GrpHdr;
    const stmt = Array.isArray(doc.Stmt) ? doc.Stmt : [doc.Stmt];

    const statements = stmt.map((s: any) => ({
      id: s.Id,
      account: this.parseAccount(s.Acct),
      balance: {
        opening: {
          amount: parseFloat(s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'OPBD')?.Amt?.['#text'] || 0),
          currency: s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'OPBD')?.Amt?.['@_Ccy'] || 'USD',
          date: s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'OPBD')?.Dt?.Dt,
        },
        closing: {
          amount: parseFloat(s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'CLBD')?.Amt?.['#text'] || 0),
          currency: s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'CLBD')?.Amt?.['@_Ccy'] || 'USD',
          date: s.Bal?.find((b: any) => b.Tp?.CdOrPrtry?.Cd === 'CLBD')?.Dt?.Dt,
        },
      },
      entries: (Array.isArray(s.Ntry) ? s.Ntry : [s.Ntry]).filter(Boolean).map((e: any) => ({
        amount: parseFloat(e.Amt?.['#text'] || e.Amt || 0),
        currency: e.Amt?.['@_Ccy'] || 'USD',
        creditDebitIndicator: e.CdtDbtInd,
        status: e.Sts,
        bookingDate: e.BookgDt?.Dt,
        valueDate: e.ValDt?.Dt,
        reference: e.AcctSvcrRef,
        details: e.NtryDtls,
      })),
    }));

    return {
      messageType: 'camt.053',
      messageId: grpHdr.MsgId,
      creationDateTime: new Date(grpHdr.CreDtTm),
      xml,
      parsed: { statements },
    };
  }

  /**
   * Parse pacs.002 - Payment Status Report
   */
  private parsePacs002(xml: string, parsed: any): ISO20022Message {
    const doc = parsed.Document?.FIToFIPmtStsRpt || parsed.FIToFIPmtStsRpt;
    const grpHdr = doc.GrpHdr;
    const txInfAndSts = Array.isArray(doc.TxInfAndSts) ? doc.TxInfAndSts : [doc.TxInfAndSts];

    const statuses = txInfAndSts.map((tx: any) => ({
      statusId: tx.StsId,
      originalInstructionId: tx.OrgnlInstrId,
      originalEndToEndId: tx.OrgnlEndToEndId,
      transactionStatus: tx.TxSts,
      statusReason: tx.StsRsnInf?.Rsn?.Cd,
      additionalInfo: tx.StsRsnInf?.AddtlInf,
    }));

    return {
      messageType: 'pacs.002',
      messageId: grpHdr.MsgId,
      creationDateTime: new Date(grpHdr.CreDtTm),
      xml,
      parsed: { statuses },
    };
  }

  /**
   * Parse pain.002 - Customer Payment Status Report
   */
  private parsePain002(xml: string, parsed: any): ISO20022Message {
    const doc = parsed.Document?.CstmrPmtStsRpt || parsed.CstmrPmtStsRpt;
    const grpHdr = doc.GrpHdr;

    return {
      messageType: 'pain.002',
      messageId: grpHdr.MsgId,
      creationDateTime: new Date(grpHdr.CreDtTm),
      xml,
      parsed: doc,
    };
  }

  /**
   * Parse generic ISO 20022 message
   */
  private parseGeneric(xml: string, parsed: any, messageType: ISO20022MessageType): ISO20022Message {
    return {
      messageType,
      messageId: `MSG-${Date.now()}`,
      creationDateTime: new Date(),
      xml,
      parsed,
    };
  }

  /**
   * Parse party information
   */
  private parseParty(party: any): ISO20022Party | undefined {
    if (!party) return undefined;

    return {
      name: party.Nm || '',
      identification: {
        organisationId: party.Id?.OrgId?.Othr?.[0]?.Id,
        bic: party.Id?.OrgId?.BICOrBEI,
        lei: party.Id?.OrgId?.LEI,
      },
      postalAddress: party.PstlAdr ? {
        streetName: party.PstlAdr.StrtNm,
        buildingNumber: party.PstlAdr.BldgNb,
        postCode: party.PstlAdr.PstCd,
        townName: party.PstlAdr.TwnNm,
        country: party.PstlAdr.Ctry,
      } : undefined,
    };
  }

  /**
   * Parse account information
   */
  private parseAccount(account: any): ISO20022Account | undefined {
    if (!account) return undefined;

    return {
      identification: {
        iban: account.Id?.IBAN,
        other: account.Id?.Othr ? {
          identification: account.Id.Othr.Id,
          schemeName: account.Id.Othr.SchmeNm?.Cd,
        } : undefined,
      },
      currency: account.Ccy,
      name: account.Nm,
    };
  }

  /**
   * Parse financial institution information
   */
  private parseAgent(agent: any): ISO20022FinancialInstitution | undefined {
    if (!agent) return undefined;

    return {
      bic: agent.FinInstnId?.BICFI || agent.FinInstnId?.BIC,
      name: agent.FinInstnId?.Nm,
      clearingSystemMemberId: agent.FinInstnId?.ClrSysMmbId ? {
        memberId: agent.FinInstnId.ClrSysMmbId.MmbId,
        clearingSystemId: agent.FinInstnId.ClrSysMmbId.ClrSysId?.Cd,
      } : undefined,
    };
  }

  /**
   * Generate pacs.008 message
   */
  generatePacs008(payments: ISO20022Payment[], messageId?: string): string {
    const msgId = messageId || `PACS008-${Date.now()}`;
    const creationDateTime = new Date().toISOString();

    const totalAmount = payments.reduce((sum, p) => sum + p.amount.value, 0);

    const doc = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      Document: {
        '@_xmlns': 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: msgId,
            CreDtTm: creationDateTime,
            NbOfTxs: payments.length.toString(),
            CtrlSum: totalAmount.toFixed(2),
            SttlmInf: {
              SttlmMtd: 'CLRG',
            },
          },
          CdtTrfTxInf: payments.map(p => ({
            PmtId: {
              InstrId: p.instructionId || p.paymentId,
              EndToEndId: p.endToEndId,
            },
            IntrBkSttlmAmt: {
              '@_Ccy': p.amount.currency,
              '#text': p.amount.value.toFixed(2),
            },
            ChrgBr: p.chargeBearer || 'SHAR',
            Dbtr: p.debtor ? { Nm: p.debtor.name } : undefined,
            DbtrAcct: p.debtorAccount ? {
              Id: { IBAN: p.debtorAccount.identification.iban },
            } : undefined,
            DbtrAgt: p.debtorAgent ? {
              FinInstnId: { BICFI: p.debtorAgent.bic },
            } : undefined,
            Cdtr: p.creditor ? { Nm: p.creditor.name } : undefined,
            CdtrAcct: p.creditorAccount ? {
              Id: { IBAN: p.creditorAccount.identification.iban },
            } : undefined,
            CdtrAgt: p.creditorAgent ? {
              FinInstnId: { BICFI: p.creditorAgent.bic },
            } : undefined,
            RmtInf: p.remittanceInformation?.unstructured ? {
              Ustrd: p.remittanceInformation.unstructured,
            } : undefined,
          })),
        },
      },
    };

    return this.builder.build(doc);
  }

  /**
   * Generate pain.001 message
   */
  generatePain001(payments: ISO20022Payment[], debtor: ISO20022Party, messageId?: string): string {
    const msgId = messageId || `PAIN001-${Date.now()}`;
    const creationDateTime = new Date().toISOString();

    const totalAmount = payments.reduce((sum, p) => sum + p.amount.value, 0);

    const doc = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      Document: {
        '@_xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.09',
        CstmrCdtTrfInitn: {
          GrpHdr: {
            MsgId: msgId,
            CreDtTm: creationDateTime,
            NbOfTxs: payments.length.toString(),
            CtrlSum: totalAmount.toFixed(2),
            InitgPty: { Nm: debtor.name },
          },
          PmtInf: {
            PmtInfId: `PMT-${msgId}`,
            PmtMtd: 'TRF',
            NbOfTxs: payments.length.toString(),
            CtrlSum: totalAmount.toFixed(2),
            ReqdExctnDt: new Date().toISOString().split('T')[0],
            Dbtr: { Nm: debtor.name },
            DbtrAcct: payments[0].debtorAccount ? {
              Id: { IBAN: payments[0].debtorAccount.identification.iban },
            } : undefined,
            DbtrAgt: payments[0].debtorAgent ? {
              FinInstnId: { BICFI: payments[0].debtorAgent.bic },
            } : undefined,
            CdtTrfTxInf: payments.map(p => ({
              PmtId: {
                InstrId: p.instructionId || p.paymentId,
                EndToEndId: p.endToEndId,
              },
              Amt: {
                InstdAmt: {
                  '@_Ccy': p.amount.currency,
                  '#text': p.amount.value.toFixed(2),
                },
              },
              Cdtr: p.creditor ? { Nm: p.creditor.name } : undefined,
              CdtrAcct: p.creditorAccount ? {
                Id: { IBAN: p.creditorAccount.identification.iban },
              } : undefined,
              CdtrAgt: p.creditorAgent ? {
                FinInstnId: { BICFI: p.creditorAgent.bic },
              } : undefined,
              RmtInf: p.remittanceInformation?.unstructured ? {
                Ustrd: p.remittanceInformation.unstructured,
              } : undefined,
            })),
          },
        },
      },
    };

    return this.builder.build(doc);
  }

  /**
   * Validate ISO 20022 message
   */
  validate(message: ISO20022Message): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.messageId) {
      errors.push('Message ID is required');
    }

    if (!message.creationDateTime) {
      errors.push('Creation date/time is required');
    }

    if (message.numberOfTransactions && message.parsed?.payments) {
      if (message.numberOfTransactions !== message.parsed.payments.length) {
        errors.push(`Number of transactions mismatch: expected ${message.numberOfTransactions}, got ${message.parsed.payments.length}`);
      }
    }

    if (message.controlSum && message.parsed?.payments) {
      const actualSum = message.parsed.payments.reduce((sum: number, p: ISO20022Payment) => sum + p.amount.value, 0);
      if (Math.abs(message.controlSum - actualSum) > 0.01) {
        errors.push(`Control sum mismatch: expected ${message.controlSum}, got ${actualSum}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ISO20022Parser;
