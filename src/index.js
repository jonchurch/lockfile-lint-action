const path = require('path');
const {
  ParseLockfile,
  ValidateHost,
  ValidateHttps,
  ValidateScheme,
} = require('lockfile-lint-api');
const { getInput } = require('@actions/core');

const lockPath =
  getInput('lockfilePath') || path.resolve(__dirname, '../package-lock.json');
const defaultSchemes = ['https:', 'http:'];
let schemes = getInput('schemes') || [];
if (schemes.length) {
  schemes = [schemes];
}
schemes = defaultSchemes.concat(schemes);

const parser = new ParseLockfile({ lockfilePath: lockPath });

const lockfile = parser.parseSync();

// const validators = [ValidateHost, ValidateHttps, ValidateScheme];
// const failures = [];

// validators.forEach(validator => {
//   const _validator = new validator({ packages: lockfile.object });
//   const result = _validator.validate();

//   if (result.errors.length) {
//     failures.push(result.errors);
//   }
// });

const hostValidator = new ValidateHost({ packages: lockfile.object });
const httpsValidator = new ValidateHttps({ packages: lockfile.object });
const schemeValidator = new ValidateScheme({ packages: lockfile.object });

function isSuccessfulResult(result) {
  if (typeof result === 'object') {
    return result.type === 'success';
  }
  return result === 'success';
}

function gatherFailures(results) {
  const failures = [];
  results.forEach(result => {
    if (isSuccessfulResult(result)) {
      return;
    }
    failures.push(result.errors.map(({ message }) => message));
  });
  return failures;
}

try {
  const schemeResults = schemeValidator.validate(schemes);
  const hostResults = hostValidator.validate(['npm']);
  const httpsResults = httpsValidator.validate();

  const failures = gatherFailures([hostResults, httpsResults, schemeResults]);

  if (failures.length) {
    console.log(failures.flat().join('\n'));
    process.exit(1);
  } else {
    console.log('Passed validators');
  }
} catch (error) {
  console.log('Something went wrong during validation:', error);
  process.exit(1);
}
