const Benchmark = require('benchmarkify');
const benchmark = new Benchmark('Benchmark validator-fns').printHeader();
const {
  object,
  string,
  number,
  required,
  min,
  max,
  email,
} = require('validator-fns');

let suite = benchmark.createSuite('Simple test');

const obj = {
  name: 'John Doe',
  email: 'john.doe@company.space',
  firstName: 'John',
  phone: '123-4567',
  age: 33,
};

const validate = object({
  name: string(required('required'), min(4, 'min:4'), max(25, 'max:25')),
  email: string(required('required'), email('email')),
  firstName: string(required('required')),
  phone: string(required('required')),
  age: number(required('required'), min(18, 'min:18')),
});

suite.add('validator-fns', done => {
  validate(obj).then(() => done());
});

suite.run();
