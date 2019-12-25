const path = require('path');
const {
  ParseLockfile,
  ValidateHost,
  ValidateHttps,
  ValidateScheme,
} = require('lockfile-lint-api');
const { getInput, setFailed } = require('@actions/core');

const lockPath =
  getInput('lockfilePath') ||
  path.join(process.env.GITHUB_WORKSPACE, 'package-lock.json');

const defaultSchemes = ['https:', 'http:'];
let schemes = getInput('schemes') || [];
if (schemes.length) {
  schemes = [schemes];
}
schemes = defaultSchemes.concat(schemes);

const parser = new ParseLockfile({ lockfilePath: lockPath });
try {
  const lockfile = parser.parseSync();
} catch (error) {
  setFailed(
    `Could not parse lockfile provided at path ${lockPath}, does that file exist?`
  );
}

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

function run() {
  try {
    const schemeResults = schemeValidator.validate(schemes);
    const hostResults = hostValidator.validate(['npm']);
    const httpsResults = httpsValidator.validate();

    const failures = gatherFailures([hostResults, httpsResults, schemeResults]);

    if (failures.length) {
      const failMessage = failures.flat().join('\n');
      setFailed(failMessage);
    } else {
      console.log('Passed validators');
    }
  } catch (error) {
    console.log(error);
    setFailed('Something went wrong during validation');
  }
}

run();
