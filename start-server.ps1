$env:NODE_ENV = 'development'
$env:PORT = '4000'
$env:DB_CLIENT = 'sqlite'
$env:SQLITE_FILE = 'C:\Users\USER\Downloads\LUMERA\lumera\data\lumera.sqlite'
$env:PAYMENT_PROVIDER = 'mock'
$env:EMAIL_DRIVER = 'console'
$env:JWT_SECRET = 'test-secret-local'

Set-Location 'C:\Users\USER\Downloads\LUMERA\lumera\server'
npm run start
