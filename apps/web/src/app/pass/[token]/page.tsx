import React from 'react';
import PassClient from './PassClient';

export function generateStaticParams() {
  return [{ token: 'preview' }];
}

export default function VisitorPassPage({ params }: { params: { token: string } }) {
  return <PassClient token={params.token} />;
}
