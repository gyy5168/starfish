class MatchAllDescriptor(object):
    def match(self, resource):
        return True


class SimpleResourceDescriptor(object):
    def match(self, resource):
        return resource.desc == self.descriptor['desc']
