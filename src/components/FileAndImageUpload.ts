import { useAppSelector } from './hooks';

export const UploadFileForCourseExtraction = (uri: string, type: string) => {
  const user = useAppSelector(state => state.user);
  const formData = new FormData();
  formData.append('file', {
    uri,
    type,
    name: 'course_form_upload'
  });
formData.append('userId', user.uid);
if (user.staffId !== '') {
  formData.append('staffId', user.staffId);
}
  fetch('http://192.168.1.98:5000/users/upload-course-form', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
    .then(res => res.json())
    .then(data => {
      console.log('Course data extracted:', data);
    })
    .catch(err => {
      console.error('Upload failed:', err);
    });
};

export const UploadImageForCourseExtraction = (uri: string) => {
    const type = 'image';
    const user = useAppSelector(state => state.user);
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

  fetch('http://192.168.1.98:5000/users/upload-course-form', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
    .then(res => res.json())
    .then(data => {
      console.log('Course data extracted:', data);
    })
    .catch(err => {
      console.error('Upload failed:', err);
    });
};
