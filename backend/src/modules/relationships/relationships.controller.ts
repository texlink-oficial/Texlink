import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { ContractsService } from '../contracts/contracts.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { UpdateRelationshipDto } from './dto/update-relationship.dto';
import { RelationshipActionDto } from './dto/relationship-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  brandId?: string;
  supplierId?: string;
}

@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(
    private readonly relationshipsService: RelationshipsService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Criar novo relacionamento
   * Marca credencia facção do pool
   */
  @Post()
  async create(
    @Body() dto: CreateRelationshipDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.create(dto, user);
  }

  /**
   * Listar fornecedores da marca (seus relacionamentos)
   */
  @Get('brand/:brandId')
  async findByBrand(
    @Param('brandId') brandId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.findByBrand(brandId, user);
  }

  /**
   * Listar marcas do fornecedor (seus relacionamentos)
   */
  @Get('supplier/:supplierId')
  async findBySupplier(
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.findBySupplier(supplierId, user);
  }

  /**
   * Listar facções disponíveis para marca credenciar
   */
  @Get('available/:brandId')
  async findAvailableForBrand(
    @Param('brandId') brandId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.findAvailableForBrand(brandId, user);
  }

  /**
   * Buscar relacionamento específico
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.relationshipsService.findOne(id, user);
  }

  /**
   * Atualizar relacionamento
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRelationshipDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.update(id, dto, user);
  }

  /**
   * Ativar relacionamento
   */
  @Post(':id/activate')
  async activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.relationshipsService.activate(id, user);
  }

  /**
   * Suspender relacionamento
   */
  @Post(':id/suspend')
  async suspend(
    @Param('id') id: string,
    @Body() dto: RelationshipActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.suspend(id, dto, user);
  }

  /**
   * Reativar relacionamento
   */
  @Post(':id/reactivate')
  async reactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.relationshipsService.reactivate(id, user);
  }

  /**
   * Encerrar relacionamento
   */
  @Post(':id/terminate')
  async terminate(
    @Param('id') id: string,
    @Body() dto: RelationshipActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.relationshipsService.terminate(id, dto, user);
  }

  // ==================== CONTRACT ENDPOINTS ====================

  /**
   * Gerar contrato para relacionamento
   */
  @Post(':id/contract/generate')
  async generateContract(
    @Param('id') id: string,
    @Body() terms: Record<string, any>,
    @CurrentUser() user: AuthUser,
  ) {
    // Verificar acesso ao relacionamento
    await this.relationshipsService.findOne(id, user);
    return this.contractsService.generateContractForRelationship(id, terms);
  }

  /**
   * Visualizar contrato do relacionamento
   */
  @Get(':id/contract')
  async getContract(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // Verificar acesso ao relacionamento
    await this.relationshipsService.findOne(id, user);
    return this.contractsService.getContractByRelationship(id);
  }

  /**
   * Assinar contrato (apenas fornecedor)
   */
  @Post(':id/contract/sign')
  async signContract(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Ip() ipAddress: string,
  ) {
    // Verificar que é o fornecedor correto
    const relationship = await this.relationshipsService.findOne(id, user);

    if (user.role !== UserRole.SUPPLIER) {
      throw new Error('Apenas o fornecedor pode assinar o contrato');
    }

    if (user.supplierId !== relationship.supplierId) {
      throw new Error('Você não tem permissão para assinar este contrato');
    }

    return this.contractsService.signContractForRelationship(
      id,
      user.supplierId!,
      ipAddress,
    );
  }
}
