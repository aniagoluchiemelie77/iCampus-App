import { useAppSelector } from './hooks';
import { useDispatch } from 'react-redux';
import { updateCoursesEnrolled } from './UserSlice';
import type {
  Course,
} from '../types/firebase';
import {baseUrl} from './HomeScreenComponents';

export const useUploadCourseFormWithProgress = () => {
  console.log('Pre send');
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();

  return (
    uri: string,
    type: string,
    onProgress: (percent: number) => void,
    onComplete: (data: any) => void,
    onError: (error: any) => void
  ) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', {
      uri,
      type,
      name: 'course_form_upload',
    });
    formData.append('userId', user.uid);
    if (user.staffId !== '') {
      formData.append('staffId', user.staffId);
    }
    console.log('Sending...');
    xhr.open('POST', `${baseUrl}users/upload-course-form`);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        console.log('Data recieved...');
        const response = JSON.parse(xhr.responseText);
        dispatch(
          updateCoursesEnrolled((response.courses as Course[]).map(c => c.courseId))
        );
        onComplete(response);
      } else {
        onError(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      onError(new Error('Network error during upload'));
    };

    xhr.send(formData);
  };
};

