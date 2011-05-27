import os, string, sys, subprocess 

path = ""


if (len(sys.argv) > 1):
    path = sys.argv[1]

files = os.listdir(path)
for f in files:
    ext = f.split(".")
    if len(ext) == 1:
        continue
    innerFiles = os.listdir(path+"/newSounds")
    sawOgg = False
    sawMp3 = False
    for innerFile in innerFiles:
        iSplit = innerFile.split(".")
        if cmp(ext[0], iSplit[0]) == 0:
            if cmp(iSplit[1], "mp3") == 0:
                sawMp3 = True
            elif cmp(iSplit[1], "ogg") ==0:
                sawOgg = True
    if not(sawOgg):
        print "file: " + f + " has no .ogg"
    if not(sawMp3):
        print "file: " + f + " has no .mp3"
        #subprocess.Popen('sox ' + path + '/' + f + ' ' + path + '/newSounds/' + ext[0] + '.mp3 rate 22050', shell=True)    
