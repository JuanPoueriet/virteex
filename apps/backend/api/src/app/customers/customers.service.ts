
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerStatus } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  create(
    createCustomerDto: CreateCustomerDto,
    organizationId: string,
  ): Promise<Customer> {
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      organizationId,
    });
    return this.customerRepository.save(customer);
  }

  findAll(organizationId: string): Promise<Customer[]> {
    return this.customerRepository.find({
      where: { organizationId },
      order: { companyName: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, organizationId },
    });
    if (!customer) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado.`);
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    organizationId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, organizationId);
    const updatedCustomer = this.customerRepository.merge(
      customer,
      updateCustomerDto,
    );
    return this.customerRepository.save(updatedCustomer);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const customer = await this.findOne(id, organizationId);
    await this.customerRepository.remove(customer);
  }

  async findOrCreateByEmail(
    email: string,
    organizationId: string,
    defaults: Partial<Customer> = {}
  ): Promise<Customer> {
    let customer = await this.customerRepository.findOne({
      where: { email, organizationId },
    });

    if (!customer) {
      customer = this.customerRepository.create({
        organizationId,
        email,
        status: CustomerStatus.ACTIVE,
        ...defaults,
      });
      await this.customerRepository.save(customer);
    }

    return customer;
  }
}