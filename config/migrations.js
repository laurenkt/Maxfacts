// Path : ./config/migrations.js 
module.exports = {
  development: {
    schema: { 'migration': {} },
    modelName: 'Migration',
    db: process.env.MONGOHQ_URL
  },
  test: {},
  production: {}
}
