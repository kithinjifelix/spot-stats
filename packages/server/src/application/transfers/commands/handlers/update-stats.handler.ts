import {
  CommandBus,
  CommandHandler,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';
import { LogManifestCommand } from '../log-manifest.command';
import { Inject, Logger } from '@nestjs/common';
import {
  Facility,
  IDocketRepository,
  IFacilityRepository,
  IMasterFacilityRepository,
} from '../../../../domain';
import { UpdateStatsCommand } from '../update-stats.command';
import { plainToClass } from 'class-transformer';
import { IManifestRepository } from '../../../../domain/transfers/manifest-repository.interface';

@CommandHandler(UpdateStatsCommand)
export class UpdateStatsHandler implements ICommandHandler<UpdateStatsCommand> {
  constructor(
    @Inject('IDocketRepository')
    private readonly docketRepository: IDocketRepository,
    @Inject('IFacilityRepository')
    private readonly facilityRepository: IFacilityRepository,
    @Inject('IManifestRepository')
    private readonly manifestRepository: IManifestRepository,
    private readonly publisher: EventPublisher,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateStatsCommand): Promise<any> {
    let facility = await this.facilityRepository.findByCode(
      command.facilityCode,
    );
    if (facility) {
      facility = plainToClass(Facility, facility);

      // TODO:CHECK NEED TO REINTSUMMARIES
      if (!facility.hasSummaries()) {
        // facility.updateSummary(command.docket, command.stats, command.updated);
      }

      facility.updateSummary(command.docket, command.stats, command.updated);

      const updatedFacility = await this.facilityRepository.update(facility);
      this.publisher.mergeObjectContext(facility).commit();
      Logger.log(`Updated Stats ${facility.name}`);

      const manifest = await this.manifestRepository.getCurrentDocket(
        facility._id,
        command.docket.name,
      );
      if (manifest) {
        const recieved = facility.getPatientSummary(command.docket.name);
        if (recieved) {
          manifest.recievedCount = recieved;
          manifest.recievedDate = command.updated;
          await this.manifestRepository.update(manifest);
        }
      }
      return updatedFacility;
    }
    return null;
  }
}
