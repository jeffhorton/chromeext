rm -rf testkick/*
cd src
cp -r css ../testkick
cp -r fonts ../testkick
cp -r images ../testkick
cp -r libs ../testkick
cp *.html ../testkick
cp *.json ../testkick
for jsfile in $(ls *.js); do java -jar ../../compiler.jar --js_output_file=../testkick/$jsfile $jsfile; done
cd ../testkick
mv *.js.js *.js
perl -pi -e 's/http:\/\/127.0.0.1:3000/https:\/\/testkick.com/g' *.js
perl -pi -e 's/{{development_version}}/production/g' tk_opt.html
cd ../
zip -r testkick.zip testkick
