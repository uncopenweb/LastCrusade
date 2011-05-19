import os, string, sys, subprocess 

path = ""


if (len(sys.argv) > 1):
    path = sys.argv[1]

os.mkdir(path + "/newSounds")

files = os.listdir(path)
for file in files:
    ext = file.split(".")
    if len(ext) == 1:
        print ext
        #should only be the subfolder that this script creates
        break
    if cmp(ext[1], "wav") == 0:
        #convert to mp3 and ogg
        print 'sox ' + path + '/' + file + ' ' + path + '/newSounds/' + ext[0] + '.mp3 rate 22050'
        subprocess.Popen('sox ' + path + '/' + file + ' ' + path + '/newSounds/' + ext[0] + '.mp3 rate 22050', shell=True)
        subprocess.Popen('sox ' + path + '/' + file + ' ' + path + '/newSounds/' + ext[0] + '.ogg rate 22050', shell=True)
    elif cmp(ext[1], "mp3") == 0:
        #convert to ogg
        subprocess.Popen('sox ' + path + '/' + file + ' ' + path + '/newSounds/' + ext[0] + '.ogg rate 22050', shell=True)  
        subprocess.Popen('cp ' + path + '/' + file + ' ' + path + '/newSounds/' + file, shell=True)
    else:
        print "***new extensions encountered: " + ext[1]

    
