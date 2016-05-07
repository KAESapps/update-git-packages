var fs = require('fs')
var isGitRepo = require('is-git-repo')
var childProcess = require('child_process')
var path = require('path')

function getPackageJson (dirPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(dirPath, 'package.json'), (err, data) => {
      if (err) return reject(err)
      resolve(JSON.parse(data))
    })
  })
}

function isGitRepoPromise (path) {
  return new Promise((resolve) => {
    isGitRepo(path, resolve)
  })
}

function getGitHeadSha(path) {
  return new Promise((resolve, reject) => {
    var gitPath = process.platform === "win32" ? "git.EXE" : "git"

    childProcess.exec(gitPath+' rev-parse HEAD', {
      cwd: path,
    }, function (err, stdout) {
      if (err) return reject(err)
      var sha = stdout.trim()
      resolve(sha)
    });
  })
}

function startWith(string, start) {
  return string.slice(0, start.length) === start
}

function isGitDependency(depVersion) {
  return startWith(depVersion, 'git+') || startWith(depVersion, 'github')
}

function updateGitDependencies(pkgJson, rootPath) {
  var dependencies = pkgJson.dependencies
  var gitDependencies = Object.keys(dependencies).filter(depName => isGitDependency(dependencies[depName]))
  return Promise.all(gitDependencies.map(depName => {
    var depVersion = dependencies[depName]
    var repoPath = path.join(rootPath, depName)
    return isGitRepoPromise(repoPath)
    .then(res => {
      if (!res) return null
      return getGitHeadSha(repoPath).then(sha => {
        var depVersionStart = depVersion.split('#')[0]
        return [depVersionStart, sha].join('#')
      })
    })
  })).then(newVersions => {
    newVersions.forEach((newVersion, i) => {
      if (typeof newVersion === 'string') {
        var depName = gitDependencies[i]
        pkgJson.dependencies[depName] = newVersion
      }
    })
    return pkgJson
  })
}

function writePackageJson(pkgJson, pkgPath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(pkgPath, 'package.json'), JSON.stringify(pkgJson, null, 2), (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

exports.getPackageJson = getPackageJson
exports.isGitRepo = isGitRepoPromise
exports.getGitHeadSha = getGitHeadSha

exports.default = function (packagePath) {
  packagePath = packagePath || process.cwd()
  return getPackageJson(packagePath)
  .then(pkgJson => updateGitDependencies(pkgJson, path.join(packagePath, 'node_modules')))
  .then(pkgJson => writePackageJson(pkgJson, packagePath))
}

