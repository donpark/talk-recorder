mkdir -p ./tmp && cd tmp
git clone --recurse-submodules https://github.com/Kagami/vmsg.git && cd vmsg
make clean all
mkdir -p ../../static/lamemp3
mv -f _vmsg.* ../../static/lamemp3
cd ../..
rm -rf tmp
