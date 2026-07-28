/** data.ts 展示模型装配测试（原 Python 版 test_build.py TestLoadModel 的移植）。
 *
 * 自含 fixture（内联 params.json 结构），不依赖 cemc-param-db。
 */

import { describe, expect, it } from 'vitest'
import { buildModel } from '../src/data'
import type { ParamDoc } from '../src/types'

const FIXTURE_DOC: ParamDoc = {
  meta: {
    schema_version: 1,
    generated_by: 'cemc-param-db',
    stats: { entries: 2, variants: 1, aliases: 2 },
  },
  entries: [
    {
      key: { discipline: 0, category: 0, number: 0 },
      name: 't',
      aliases: ['2t'],
      wgrib2_name: 'TMP',
      unit: 'K',
      description: 'Temperature',
      description_cn: '温度',
      remark: '测试条目',
      updated_at: '2026-07-28 00:00:00',
      variants: [
        {
          name: 't2m',
          aliases: ['t_2m'],
          when: { first_level_type: 103, first_level: 2 },
          typeOfLevel: 'heightAboveGround',
          level: 2,
        },
      ],
    },
    {
      key: { discipline: 10, category: 0, number: 4 },
      name: 'sst',
      updated_at: '2026-07-28 00:00:00',
    },
  ],
}

describe('buildModel', () => {
  it('装配展示字段', () => {
    const model = buildModel(FIXTURE_DOC)
    const t = model.entries[0]
    expect(t.triplet).toBe('0.0.0')
    expect(t.disciplineLabel).toBe('气象')
    expect(t.variants[0].whenText).toBe('first_level_type=103, first_level=2')
    expect(model.disciplines).toEqual([
      { value: 0, label: '气象' },
      { value: 10, label: '海洋' },
    ])
  })

  it('搜索索引覆盖别名与变体', () => {
    const t = buildModel(FIXTURE_DOC).entries[0]
    for (const needle of ['2t', 't2m', 't_2m', '温度', '0.0.0', 'tmp']) {
      expect(t.searchText).toContain(needle.toLowerCase())
    }
  })

  it('schema_version 不兼容时拒绝', () => {
    const bad: ParamDoc = {
      ...FIXTURE_DOC,
      meta: { ...FIXTURE_DOC.meta, schema_version: 999 },
    }
    expect(() => buildModel(bad)).toThrowError(/schema_version/)
  })
})
