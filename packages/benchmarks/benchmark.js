import Benchmark from 'benchmarkify';
import * as V from 'validator-fns';
import * as V1 from 'validator-fns-v1'
import * as V2 from 'validator-fns-v2'
import { z } from 'zod'
import * as s from 'superstruct'

const benchmark = new Benchmark('Benchmark validator-fns').printHeader();

const input = {
  username: 'foo',
  favoriteFruit: 'apple',
  yearJoined: 2020,
  flags: {
    premium: true,
    complex: false,
  },
  cart: [
    {
      id: 1,
      name: 'apple',
      count: 4,
      price: 100
    },
    {
      id: 2,
      name: 'orange',
      count: 1,
      price: 75
    }
  ]
}

const v1 = V1.object({
  username: V1.string(V1.required('username required'), V1.matches(/[a-z]{3,20/i, 'username letters only'), V1.min(3, 'username min length'), V1.max(20, 'username max length')),
  favoriteFruit: V1.string(V1.oneOf(['apple', 'orange', 'banana', 'pineapple', 'strawberry'], 'fruit type'), V1.required('fruit required')),
  yearJoined: V1.number(V1.integer('year integer'), V1.max(new Date().getFullYear(), 'current year'), V1.min(2000, 'not before 2000')),
  flags: V1.object({
    premium: V1.boolean(),
    complex: V1.boolean()
  }),
  cart: V1.array(
    V1.object({
      id: V1.number(V1.required('id required')),
      name: V1.string(V1.required('name required')),
      count: V1.number(V1.required('count required'), V1.integer('count integer')),
      price: V1.number(V1.required('price required'), V1.integer('price integer'))
    })
  )
})

const v2 = V2.object({
  username: V2.string(V2.required('username required'), V2.matches(/[a-z]{3,20/i, 'username letters only'), V2.min(3, 'username min length'), V2.max(20, 'username max length')),
  favoriteFruit: V2.string(V2.oneOf(['apple', 'orange', 'banana', 'pineapple', 'strawberry'], 'fruit type'), V2.required('fruit required')),
  yearJoined: V2.number(V2.integer('year integer'), V2.max(new Date().getFullYear(), 'current year'), V2.min(2000, 'not before 2000')),
  flags: V2.object({
    premium: V2.boolean(),
    complex: V2.boolean()
  }),
  cart: V2.array(
    V2.object({
      id: V2.number(V2.required('id required')),
      name: V2.string(V2.required('name required')),
      count: V2.number(V2.required('count required'), V2.integer('count integer')),
      price: V2.number(V2.required('price required'), V2.integer('price integer'))
    })
  )
})

const v = V.object({
  username: V.string({
    pattern: /[a-z]{3,20}/i,
    minLength: 3,
    maxLength: 20,
  }),
  favoriteFruit: V.string({
    pattern: /(apple|orange|banana|pineapple|strawberry)/
  }),
  yearJoined: V.number({
    integer: true,
    min: 2000,
    max: new Date().getFullYear(),
  }),
  flags: V.object({
    premium: V.boolean({ optional: true }),
    complex: V.boolean({ optional: true }),
  }),
  cart: V.array(V.object({
    id: V.number({ integer: true }),
    name: V.string(),
    count: V.number({ integer: true }),
    price: V.number({ integer: true })
  }))
})

const zod = z.object({
  username: z.string().regex(/[a-z]{3,20}/i).min(3).max(20),
  favoriteFruit: z.enum(['apple', 'orange', 'banana', 'pineapple', 'strawberry']),
  yearJoined: z.number().int().min(2000).max(new Date().getFullYear()),
  flags: z.object({
    premium: z.boolean().optional(),
    complex: z.boolean().optional(),
  }),
  cart: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      count: z.number().int(),
      price: z.number().int()
    })
  )
})

const superstruct = s.object({
  username: s.size(s.pattern( s.string(), /[a-z]{3,20}/i), 3, 20),
  favoriteFruit: s.enums(['apple', 'orange', 'banana', 'pineapple', 'strawberry']),
  yearJoined: s.size(s.integer(), 2000, new Date().getFullYear()),
  flags: s.object({
    premium: s.optional(s.boolean()),
    complex: s.optional(s.boolean())
  }),
  cart: s.array(
    s.object({
      id: s.integer(),
      name: s.string(),
      count: s.integer(),
      price: s.integer()
    })
  )
})

benchmark.createSuite('validate')
  .add('validator-fns v1', async () => {
    await v1(input)
  })
  .add('validator-fns v2', async () => {
    await v2(input)
  })
  .add('validator-fns v3', () => {
    V.is(v, input)
  })
  .add('zod', () => {
    zod.safeParse(input)
  })
  .add('superstruct', () => {
    s.is(input, superstruct)
  })

benchmark.run()