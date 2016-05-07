var updateGitPackages = require('./index').default
updateGitPackages()
  .then(()=>console.log("done"))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
