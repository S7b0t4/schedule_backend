rm -rf Client

git submodule add https://github.com/S7b0t4/schedule.git Client

cd Client

npm i

npm run build

cd ..

npm start
