import * as migration_20260827_113228_initial from './20260827_113228_initial';

export const migrations = [
  {
    up: migration_20260827_113228_initial.up,
    down: migration_20260827_113228_initial.down,
    name: '20260827_113228_initial'
  },
];
