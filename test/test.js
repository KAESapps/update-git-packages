var test = require('blue-tape')
var path = require('path')

var updateGitPackages = require('../index')
var isGitRepo = updateGitPackages.isGitRepo
var getGitHeadSha = updateGitPackages.getGitHeadSha
var getPackageJson = updateGitPackages.getPackageJson

var hostPackagePath = process.cwd()
var gitDepPath = path.join(hostPackagePath, 'node_modules', 'ks-admin')

test('isGitRepo', t => {
  return isGitRepo(gitDepPath).then(res =>
    t.ok(res)
  )
})

test('get sha of a git repo', t => {
  return getGitHeadSha(gitDepPath).then(sha => {
    t.is(sha, 'a573f1e6428c8815731ee5a2c6ad4ae4980b1a87')
  })
})

test('getPackageJson', t =>
  getPackageJson(hostPackagePath).then(pkg => {
    t.is(pkg.name, 'update-git-packages')
  })
)