import cv2
import sys
import json

if __name__ == '__main__':

    if len(sys.argv) < 4:
        print json.dumps({'success': False, 'msg': 'Usage: python singleInsertSwapedFaces.py painting outputPath swappedHeadPaths'})
        sys.exit(1)

    PRE_PATH = '.'

    with open(PRE_PATH + '/faceDatabase.json') as input_data:    
        data = json.load(input_data)

    paintingId = sys.argv[1]
    PATH_TO_PORTRAIT = PRE_PATH + '/paintings/' + paintingId + '.png'
    PATH_TO_OUTPUT = sys.argv[2]
    heads = sys.argv[3:]

    painting = cv2.imread(PATH_TO_PORTRAIT)

    for i, head in enumerate(heads):
        headIm = cv2.imread(head)
        f = data[paintingId]['faces'][i]['coordinates']
        painting[f[0]:f[1], f[2]:f[3]] = headIm

    cv2.imwrite(PATH_TO_OUTPUT, painting)
