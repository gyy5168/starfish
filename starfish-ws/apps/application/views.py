import json
import xlsxwriter

from datetime import datetime
from django.http import HttpResponse
from rest_framework.response import Response

from apps.application.models import Application

from common.const import ErrorCode
from common.utils import AttachmentView
from common.viewset import ViewSet


class ApplicationViewSet(ViewSet):
    def create(self, request):
        Application(contact=request.GET['contact']).save()
        ret = '%s(%s)' % (request.GET['callback'], json.dumps({'errcode': ErrorCode.OK}))
        return HttpResponse(ret, content_type='application/json')


class ExportView(AttachmentView):
    ADMIN_USER_IDS = (1, 2, 4)

    EXPORT_FILE_NAME = 'export.xlsx'
    EXPORT_FILE_PATH = '/tmp/%s' % EXPORT_FILE_NAME

    def get(self, request):
        if request.current_uid not in self.ADMIN_USER_IDS:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        workbook = xlsxwriter.Workbook('/tmp/export.xlsx')
        worksheet = workbook.add_worksheet()

        row = col = 0
        for i in Application.objects.all():
            dt = datetime.fromtimestamp(i.create_at).strftime('%Y-%m-%d %H:%M:%S')
            worksheet.write(row, col, i.contact)
            worksheet.write(row, col + 1, dt)
            row += 1

        workbook.close()

        return self._build_attachment_response(
            request, self.EXPORT_FILE_NAME, self.EXPORT_FILE_PATH)
