import { displaysModule } from './definitions/displays';
import { logicModule } from './definitions/logic';
import { loopsModule } from './definitions/loops';
import { mathModule } from './definitions/math';
import { outputsModule } from './definitions/outputs';
import { pinsModule } from './definitions/pins';
import { proceduresModule } from './definitions/procedures';
import { programModule } from './definitions/program';
import { sensorsModule } from './definitions/sensors';
import { serialModule } from './definitions/serial';
import { textModule } from './definitions/text';
import { timeModule } from './definitions/time';
import { variablesModule } from './definitions/variables';
import type { BlockModule } from './types';

export const BLOCK_MODULES: readonly BlockModule[] = [
  programModule,
  pinsModule,
  outputsModule,
  displaysModule,
  sensorsModule,
  timeModule,
  serialModule,
  logicModule,
  loopsModule,
  mathModule,
  textModule,
  variablesModule,
  proceduresModule,
];
