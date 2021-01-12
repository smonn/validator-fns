const {
  object,
  string,
  number,
  required,
  min,
  max,
  email,
} = require('validator-fns');

const validate = object({
  username: string(
    required('Username is required.'),
    min(4, 'Username must be at least four characters.'),
    max(24, 'Username must be at most 24 characters.')
  ),
  email: string(
    required('Email is required.'),
    email('Must be a valid email address.')
  ),
  age: number(
    required('Age is required.'),
    min(18, 'You must be above 18 to use this service.')
  ),
});

function logResult({ value, state, errors }) {
  if (state === 'valid') {
    console.log('value', value);
  } else {
    console.log('errors', errors);
  }
}

const validObject = {
  username: 'good-guy',
  email: 'good-guy@example.com',
  age: 30,
};

validate(validObject).then(logResult);

const invalidObject = {
  email: 'malformed',
  age: 12,
};

validate(invalidObject).then(logResult);
