var fs = require("fs");
var isGitRepo = require("is-git-repo");
var childProcess = require("child_process");
var path = require("path");

function getPackageJson(dirPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(dirPath, "package.json"), (err, data) => {
      if (err) return reject(err);
      resolve(JSON.parse(data));
    });
  });
}

function isGitRepoPromise(path) {
  return new Promise((resolve) => {
    isGitRepo(path, resolve);
  });
}

function getGitHeadSha(path) {
  return new Promise((resolve, reject) => {
    var gitPath = process.platform === "win32" ? "git.EXE" : "git";

    childProcess.exec(
      gitPath + " rev-parse HEAD",
      {
        cwd: path,
      },
      function (err, stdout) {
        if (err) return reject(err);
        var sha = stdout.trim();
        resolve(sha);
      }
    );
  });
}

function startWith(string, start) {
  return string.slice(0, start.length) === start;
}

function isGitDependency(depVersion) {
  return (
    startWith(depVersion, "git+") ||
    startWith(depVersion, "github") ||
    startWith(depVersion, "git://")
  );
}

function updateGitDependencies(pkgJson, rootPath, opts = {}) {
  const pkgDependenciesPath = opts.devDependencies
    ? "devDependencies"
    : "dependencies";
  var dependencies = pkgJson[pkgDependenciesPath];
  var gitDependencies = Object.keys(dependencies).filter((depName) =>
    isGitDependency(dependencies[depName])
  );
  console.log("git dependencies", gitDependencies);
  return Promise.all(
    gitDependencies.map((depName) => {
      var depVersion = dependencies[depName];
      var repoPath = path.join(rootPath, depName);
      return isGitRepoPromise(repoPath).then((res) => {
        if (!res) {
          console.log("no local git repo found for", depName, "at", repoPath);
          return null;
        }
        console.log("local git repo found for", depName, "at", repoPath);
        return getGitHeadSha(repoPath).then((sha) => {
          console.log(depName, "HEAD sha is", sha);
          var depVersionStart = depVersion.split("#")[0];
          return [depVersionStart, sha].join("#");
        });
      });
    })
  ).then((latestVersions) => {
    latestVersions.forEach((latestVersion, i) => {
      if (typeof latestVersion === "string") {
        var depName = gitDependencies[i];
        if (pkgJson[pkgDependenciesPath][depName] !== latestVersion) {
          pkgJson[pkgDependenciesPath][depName] = latestVersion;
          console.log(depName, "updated to", latestVersion);
        } else {
          console.log(depName, "already uptodate");
        }
      }
    });
    return pkgJson;
  });
}

function writePackageJson(pkgJson, pkgPath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(pkgPath, "package.json"),
      JSON.stringify(pkgJson, null, 2),
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

exports.getPackageJson = getPackageJson;
exports.isGitRepo = isGitRepoPromise;
exports.getGitHeadSha = getGitHeadSha;

exports.default = function (packagePath) {
  packagePath = packagePath || process.cwd();
  return getPackageJson(packagePath)
    .then((pkgJson) =>
      updateGitDependencies(pkgJson, path.join(packagePath, "node_modules"))
    )
    .then((pkgJson) =>
      updateGitDependencies(pkgJson, path.join(packagePath, "node_modules"), {
        devDependencies: true,
      })
    )
    .then((pkgJson) => writePackageJson(pkgJson, packagePath));
};
