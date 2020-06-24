# experimental skinny publisher
yarn build
rm -rf tmp-publish
mkdir tmp-publish
cp -R dist/* tmp-publish
cp publish-package.json tmp-publish/package.json
pushd tmp-publish
npm publish
popd
rm -rf tmp-publish

