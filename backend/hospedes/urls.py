from rest_framework.routers import DefaultRouter

from .views import HospedeViewSet

app_name = 'hospedes'

router = DefaultRouter()
router.register('hospedes', HospedeViewSet, basename='hospede')

urlpatterns = router.urls
