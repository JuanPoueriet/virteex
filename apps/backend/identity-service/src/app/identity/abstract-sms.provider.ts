import { Injectable } from '@nestjs/common';
@Injectable()
export abstract class AbstractSmsProvider {
    abstract send(to: string, message: string): Promise<void>;
}

@Injectable()
export class SmsProviderStub extends AbstractSmsProvider {
    async send(to: string, message: string): Promise<void> {
        console.log(`Sending SMS to ${to}: ${message}`);
    }
}
