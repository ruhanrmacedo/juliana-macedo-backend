import { DataSource, EntityManager, ObjectLiteral, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { AppDataSource } from "../../config/ormconfig";
import { ProfessionalProfile } from "../../models/ProfessionalProfile";
import { ProfessionalService as ServiceEntity } from "../../models/ProfessionalService";
import { ProfessionalFaq } from "../../models/ProfessionalFaq";
import { NotFound } from "../../models/anthropometry/calculators/utils/errors";
import { INITIAL_AUTHOR_PROFILE_SLUG } from "../../seeds/professionalProfileData";
import { assertProfessionalProfilePublishable } from "../../utils/professionalContent";
import {
  toAdminProfessionalFaqDto, toAdminProfessionalProfileDto,
  toAdminProfessionalServiceDto, toPublicProfessionalFaqDto,
  toPublicProfessionalProfileDto, toPublicProfessionalServiceDto,
} from "../../serializers/professionalSerializer";
import { assertProfessionalAdmin, ProfessionalActor } from "./ProfessionalPolicies";
import { ProfessionalConflict } from "./ProfessionalErrors";
import {
  assertUsefulPublishedProfile, faqInput, profilePatch, serviceInput,
} from "./ProfessionalInputs";

type Store = Pick<DataSource, "getRepository" | "transaction">;
type Reader = Pick<DataSource, "getRepository">;
const ORDER = { displayOrder: "ASC", id: "ASC" } as const;

export class ProfessionalApiService {
  constructor(private readonly store: Store = AppDataSource) {}

  private async profile(reader: Reader, children = false, publicOnly = false) {
    const profile = await reader.getRepository(ProfessionalProfile).findOne({
      where: {
        authorProfile: {
          slug: INITIAL_AUTHOR_PROFILE_SLUG,
          ...(publicOnly ? { isActive: true } : {}),
        },
        ...(publicOnly ? { isPublished: true } : {}),
      },
      relations: children ? ["authorProfile", "services", "faqs"] : ["authorProfile"],
    });
    if (
      !profile || profile.authorProfile?.slug !== INITIAL_AUTHOR_PROFILE_SLUG ||
      (publicOnly && (!profile.isPublished || !profile.authorProfile.isActive))
    ) {
      throw new NotFound("Perfil profissional indisponível.");
    }
    return profile;
  }

  async publicProfile() {
    return toPublicProfessionalProfileDto(await this.profile(this.store, true, true));
  }

  async publicServices() {
    const profile = await this.profile(this.store, false, true);
    const services = await this.store.getRepository(ServiceEntity).find({
      where: {
        professionalProfile: { id: profile.id },
        isPublished: true, isArchived: false,
      },
      order: ORDER,
    });
    return services
      .filter((item) => item.isPublished && !item.isArchived)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .map(toPublicProfessionalServiceDto);
  }

  async publicFaqs() {
    const profile = await this.profile(this.store, false, true);
    const faqs = await this.store.getRepository(ProfessionalFaq).find({
      where: { professionalProfile: { id: profile.id }, isPublished: true },
      order: ORDER,
    });
    return faqs.filter((item) => item.isPublished)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .map(toPublicProfessionalFaqDto);
  }

  async adminProfile(actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    return toAdminProfessionalProfileDto(await this.profile(this.store, true));
  }

  async adminServices(actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const profile = await this.profile(this.store);
    const services = await this.store.getRepository(ServiceEntity).find({
      where: { professionalProfile: { id: profile.id } }, order: ORDER,
    });
    return services.map(toAdminProfessionalServiceDto);
  }

  async adminFaqs(actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const profile = await this.profile(this.store);
    const faqs = await this.store.getRepository(ProfessionalFaq).find({
      where: { professionalProfile: { id: profile.id } }, order: ORDER,
    });
    return faqs.map(toAdminProfessionalFaqDto);
  }

  private async service(reader: Reader, id: number, profileId: number) {
    const service = await reader.getRepository(ServiceEntity).findOne({
      where: { id, professionalProfile: { id: profileId } },
    });
    if (!service) throw new NotFound("Serviço não encontrado.");
    return service;
  }

  private async faq(reader: Reader, id: number, profileId: number) {
    const faq = await reader.getRepository(ProfessionalFaq).findOne({
      where: { id, professionalProfile: { id: profileId } },
    });
    if (!faq) throw new NotFound("Pergunta frequente não encontrada.");
    return faq;
  }

  async adminService(id: number, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const profile = await this.profile(this.store);
    return toAdminProfessionalServiceDto(await this.service(this.store, id, profile.id));
  }

  async adminFaq(id: number, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const profile = await this.profile(this.store);
    return toAdminProfessionalFaqDto(await this.faq(this.store, id, profile.id));
  }

  private async updateVersioned<T extends ObjectLiteral>(
    repository: Repository<T>,
    current: { id: number; version: number },
    version: number,
    fields: Record<string, unknown>,
    scope: { column: "author_profile_id" | "professional_profile_id"; id: number }
  ) {
    if (current.version !== version) {
      throw new ProfessionalConflict("Registro atualizado por outra operação. Recarregue os dados.");
    }
    const result = await repository.createQueryBuilder().update()
      .set({
        ...fields,
        version: () => '"version" + 1',
        updatedAt: () => "CURRENT_TIMESTAMP",
      } as QueryDeepPartialEntity<T>)
      .where("id = :id", { id: current.id })
      .andWhere("version = :version", { version })
      .andWhere(`${scope.column} = :scopeId`, { scopeId: scope.id })
      .execute();
    if (result.affected !== 1) {
      throw new ProfessionalConflict("Registro atualizado por outra operação. Recarregue os dados.");
    }
  }

  async patchProfile(input: unknown, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const patch = profilePatch(input);
    return this.store.transaction(async (manager: EntityManager) => {
      const current = await this.profile(manager);
      const final = { ...current, ...patch.fields } as ProfessionalProfile;
      if (final.isPublished) {
        assertProfessionalProfilePublishable(final);
        assertUsefulPublishedProfile(final);
      }
      const publishedAt = final.isPublished
        ? (current.isPublished ? current.publishedAt ?? new Date() : new Date())
        : null;
      await this.updateVersioned(
        manager.getRepository(ProfessionalProfile), current, patch.version,
        { ...patch.fields, publishedAt },
        { column: "author_profile_id", id: current.authorProfile.id }
      );
      return toAdminProfessionalProfileDto(await this.profile(manager, true));
    });
  }

  async createService(input: unknown, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const normalized = serviceInput(input);
    return this.store.transaction(async (manager: EntityManager) => {
      const profile = await this.profile(manager);
      const repository = manager.getRepository(ServiceEntity);
      const created = await repository.save(repository.create({
        ...normalized.fields, professionalProfile: profile,
      }));
      return toAdminProfessionalServiceDto(created);
    });
  }

  async patchService(id: number, input: unknown, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    return this.store.transaction(async (manager: EntityManager) => {
      const profile = await this.profile(manager);
      const current = await this.service(manager, id, profile.id);
      const normalized = serviceInput(input, current);
      await this.updateVersioned(
        manager.getRepository(ServiceEntity), current, normalized.version!,
        normalized.fields, { column: "professional_profile_id", id: profile.id }
      );
      return toAdminProfessionalServiceDto(await this.service(manager, id, profile.id));
    });
  }

  async createFaq(input: unknown, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    const normalized = faqInput(input);
    return this.store.transaction(async (manager: EntityManager) => {
      const profile = await this.profile(manager);
      const repository = manager.getRepository(ProfessionalFaq);
      const created = await repository.save(repository.create({
        ...normalized.fields, professionalProfile: profile,
      }));
      return toAdminProfessionalFaqDto(created);
    });
  }

  async patchFaq(id: number, input: unknown, actor?: ProfessionalActor) {
    assertProfessionalAdmin(actor);
    return this.store.transaction(async (manager: EntityManager) => {
      const profile = await this.profile(manager);
      const current = await this.faq(manager, id, profile.id);
      const normalized = faqInput(input, current);
      await this.updateVersioned(
        manager.getRepository(ProfessionalFaq), current, normalized.version!,
        normalized.fields, { column: "professional_profile_id", id: profile.id }
      );
      return toAdminProfessionalFaqDto(await this.faq(manager, id, profile.id));
    });
  }
}
