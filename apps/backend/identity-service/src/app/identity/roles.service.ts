import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDto } from './update-role.dto';
import { IRolesService } from './identity.interfaces';

@Injectable()
export class RolesService implements IRolesService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>
    ) { }

    async findAllByOrg(organizationId: string) {
        return this.roleRepository.find({ where: { organizationId } });
    }

    async findOne(id: string, organizationId: string): Promise<Role> {
        const role = await this.roleRepository.findOne({ where: { id, organizationId } });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async create(createRoleDto: CreateRoleDto, organizationId: string): Promise<Role> {
        const role = this.roleRepository.create({ ...createRoleDto, organizationId });
        return this.roleRepository.save(role);
    }

    async update(id: string, updateRoleDto: UpdateRoleDto, organizationId: string): Promise<Role> {
        const role = await this.findOne(id, organizationId);
        Object.assign(role, updateRoleDto);
        return this.roleRepository.save(role);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const role = await this.findOne(id, organizationId);
        await this.roleRepository.remove(role);
    }
}
