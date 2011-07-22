import os, re, sys

rmv = []
indx = 0
tFile = sys.argv[1]
for arg in sys.argv:
    if indx!=0 and indx!=1:
        rmv.append(arg)
    indx = indx + 1
print rmv

os.rename( tFile, "1" + tFile  )
destination= open( tFile, "w" )
source= open( "1" + tFile, "r" )

for line in source:
    cleanLn = re.sub(r'\s', '', line)
    arr = cleanLn.split(':')
    a = 1
    test = False
    for rm in rmv:
        if arr[0] == rm:
            test = True
    if not test:
        destination.write( line )
                
source.close()
destination.close()
