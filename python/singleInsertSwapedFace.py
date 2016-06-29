import cv2
import sys
import os
import json

if __name__ == '__main__':
	
	if len(sys.argv) != 4:
		print json.dumps({'success':False, 'msg':'Usage: python singleInsertSwapedFaces.py painting swappedHeadPath outputPath'})
		sys.exit(1)

	with open('faceDatabase.json') as input_data:    
		faces = json.load(input_data)

	paintingNumber = sys.argv[1]
	PATH_TO_PORTRAIT = './paintings/' + paintingNumber + '.png'
	PATH_TO_SWAPPED_HEAD = sys.argv[2]
	PATH_TO_OUTPUT = sys.argv[3]

	painting = cv2.imread(PATH_TO_PORTRAIT)
	swappedHead = cv2.imread(PATH_TO_SWAPPED_HEAD)
	f = faces[paintingNumber][0]
	painting[f[0]:f[1], f[2]:f[3]] = swappedHead

	cv2.imwrite(PATH_TO_OUTPUT, painting)