import cv2
import dlib
import numpy
import sys
import json
import os
import time
from random import choice
from string import ascii_uppercase
import urllib

PRE_PATH = ""
PREDICTOR_PATH = PRE_PATH + 'shape_predictor_68_face_landmarks.dat'
PATH_TO_INPUT_IMAGES = PRE_PATH + 'sessions/'
PATH_TO_OUTPUT_IMAGES = PRE_PATH + 'public/images/'
#__CHECK__ Needs to be more random eventually
FOLDER_NAME = str(int(round(time.time() * 1000))) + '_' + ''.join(choice(ascii_uppercase) for i in range(8)) + '/'

#lists of vectors to be compared to point 30 (tip of nose)
Y_AXIS_INDICATORS = [[0,1,2],[16,15,14]]
#lists of points to be compared.
Z_AXIS_INDICATORS = [[(48,54),(36,45)],[(27,30)]]
NOSE_TIP = 30
FACE_SCALE_FACTOR = 6

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(PREDICTOR_PATH)

def get_faces(im):
	rects = detector(im, 1)
	height, width = im.shape[:2]
	faces = []
	face_rects = []

	if len(rects) == 0:
		return False, False, False

	# If there are faces, make directories
	os.mkdir(PATH_TO_INPUT_IMAGES + FOLDER_NAME)
	os.mkdir(PATH_TO_OUTPUT_IMAGES + FOLDER_NAME)
	os.mkdir(PATH_TO_INPUT_IMAGES + FOLDER_NAME + 'input/')
	os.mkdir(PATH_TO_INPUT_IMAGES + FOLDER_NAME + 'swapped/')

	for i, face in enumerate(rects):

		bottom = face.bottom() + face.height()/FACE_SCALE_FACTOR
		rec_bottom = face.height() + face.height()/FACE_SCALE_FACTOR - 1
		if bottom > height:
			bottom = height
		top = face.top() - face.height()/FACE_SCALE_FACTOR
		rec_top = face.height()/FACE_SCALE_FACTOR
		if top < 0:
			rec_top = face.height()/FACE_SCALE_FACTOR + top
			rec_bottom = face.height() + face.height()/FACE_SCALE_FACTOR - 1 + top
			top = 0
		right = face.right() + face.width()/FACE_SCALE_FACTOR
		rec_right = face.width() + face.width()/FACE_SCALE_FACTOR - 1
		if right > width:
			right = width
		left = face.left() - face.width()/FACE_SCALE_FACTOR
		rec_left = face.width()/FACE_SCALE_FACTOR
		if left < 0:
			rec_left = face.width()/FACE_SCALE_FACTOR + left
			rec_right = face.width() + face.width()/FACE_SCALE_FACTOR - 1 + left
			left = 0
		
		face_im = im[top: bottom, left: right]
		face_dest = PATH_TO_INPUT_IMAGES + FOLDER_NAME + 'input/' + str(i) + '.png'
		cv2.imwrite(face_dest, face_im)
		faces.append(cv2.imread(face_dest, cv2.IMREAD_COLOR))
		new_rec = dlib.rectangle(left = rec_left, top = rec_top, right = rec_right, bottom = rec_bottom)
		face_rects.append(new_rec)

	return faces, face_rects

def get_landmarks(faces, rects):
	landmarks = []
	for face, rect in zip(faces, rects):
		landmarks.append(numpy.matrix([[p.x, p.y] for p in predictor(face, rect).parts()]))
	return landmarks

def load_imageUrl(imUrl):
	try: resp = urllib.urlopen(imUrl)
	except urllib.error.URLError:
		return None
	im = numpy.asarray(bytearray(resp.read()), dtype="uint8")
	im = cv2.imdecode(im, cv2.IMREAD_COLOR)
	return im

def read_faces_and_landmarks(imUrl):
	im = load_imageUrl(imUrl)
	if im is None:
		return False, False
	faces, rects = get_faces(im)
	if faces == False:
		return False, False
	landmarks = get_landmarks(faces, rects)
	return faces, landmarks

def calculate_faceangle(im, s):
	nose_x = s[NOSE_TIP].item(0)
	left = []
	right = []

	for a,b in zip(s[Y_AXIS_INDICATORS[0]], s[Y_AXIS_INDICATORS[1]]):

		left.append(a.item(0) - nose_x)
		right.append(b.item(0) - nose_x)

		# if SHOWDISTANCES:
		# 	cv2.line(im, (a.item(0), a.item(1)), (s[NOSE_TIP].item(0), s[NOSE_TIP].item(1)) , (0,255,0), 1)
		# 	cv2.line(im, (s[NOSE_TIP].item(0), s[NOSE_TIP].item(1)), (b.item(0), b.item(1)), (0,255,0), 1)
		# 	cv2.putText(im, str(a.item(0) - nose_x), ((nose_x + a.item(0))/2, ((s[NOSE_TIP].item(1) + a.item(1))/2) + 3), FONT, 0.5, (0,0,255), 1)
		# 	cv2.putText(im, str(b.item(0) - nose_x), ((nose_x + b.item(0))/2, ((s[NOSE_TIP].item(1) + b.item(1))/2) + 3), FONT, 0.5, (0,0,255), 1)
	
	# cv2.imshow("Faces", im)
	# cv2.waitKey(0)

	avgs = numpy.mean(numpy.matrix([left,right]), axis=1)
	avgs = [item for sublist in avgs.tolist() for item in sublist]

	#Makes sure averages don't cross to the other side
	if avgs[0] > 0:
		avgs[0] = 1
	if avgs[1] < 0:
		avgs[1] = 1

	if avgs[0] + avgs[1] < 0:
		rotationDirection = -1
	else:
		rotationDirection = 1

	if abs(avgs[0]) > abs(avgs[1]):
		rotationMagnitude = round(abs(avgs[0]/avgs[1]), 2) * rotationDirection
	else:
		rotationMagnitude = round(abs(avgs[1]/avgs[0]), 2) * rotationDirection

	if not rotationMagnitude or abs(rotationMagnitude) > 11.8:
		return (None, None)

	# If they look to the right image will be mirrored
	if rotationMagnitude > 0:
		mirror = False
	else:
		mirror = True

	if abs(rotationMagnitude) <= 1.37:
		mag = '0'
	elif abs(rotationMagnitude) <= 1.98:
		mag = '1'
	elif abs(rotationMagnitude) <= 3:
		mag = '2'
	elif abs(rotationMagnitude) <= 5.1:
		mag = '3'
	elif abs(rotationMagnitude) <= 11.8:
		mag = '4'

	return (mag, mirror)

if __name__ == '__main__':

	if len(sys.argv) != 2:
		print json.dumps({'success':False, 'msg':'WRONG_INPUT', 'error': 0})
		sys.exit(1)
	
	# Set path to image folder
	imagePath = sys.argv[1]

	magnitudes = []
	facePaths = []

	faces, landmarks = read_faces_and_landmarks(imagePath)

	if faces == False:
		print json.dumps({'success':False, 'msg':'NO_FACES', 'error': 1})
		sys.exit(1)

	mags = []
	datas = []

	count = 0

	for face, landmark in zip(faces, landmarks):
		# faceAngle is a tuple with rotationMagnitude and the mirror-boolean
		faceAngle = calculate_faceangle(face, landmark)
		rotationMagnitude = faceAngle[0]
		if rotationMagnitude:
			mags.append(rotationMagnitude)
			datas.append({'magnitude': rotationMagnitude, 'mirror':faceAngle[1], 'image_path': str(count) + '.png'})
		count = count + 1

	if len(mags) == 0:
		print json.dumps({'success': False, 'msg': 'NO_FACES_W_MAG', 'error': 1})
		sys.exit(1)
	
	datas = [c for (m,c) in sorted(zip(mags,datas))]
	mags.sort()
	magnitudeString = ''.join(str(i) for i in mags)
	print json.dumps({ 'success':True, 'session':{'faces': datas, 'magnitudes': magnitudeString, 'sessionId':FOLDER_NAME[:-1], 'face_count': len(datas)} })
	sys.exit(0)
